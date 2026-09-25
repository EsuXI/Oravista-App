// Component contract tests. Native rendering/effects are stubbed; device QA is separate.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const appRoot = path.resolve(__dirname, '..');
const dependencyRoot = process.env.ORAVISTA_TEST_DEPS || appRoot;
const dependency = createRequire(path.join(dependencyRoot, 'package.json'));
const babel = dependency('@babel/core');
const React = dependency('react');
const calls = [];
const navigation = { navigate: (...args) => calls.push(args), replace: (...args) => calls.push(args), goBack: () => calls.push(['back']) };
const react = { ...React, useState: value => [typeof value === 'function' ? value() : value, () => {}], useEffect: () => {}, useCallback: f => f, useMemo: f => f(), useRef: v => ({ current: v }) };
const native = {
  StyleSheet: { create: x => x, absoluteFillObject: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 } },
  Platform: { OS: 'android', select: obj => obj.android || obj.default },
  Dimensions: { get: () => ({ width: 320, height: 640 }) },
  useWindowDimensions: () => ({ width: 320, height: 640 }),
  Animated: { View: 'AnimatedView', Value: class { setValue() {} }, timing: () => ({ start() {} }) },
  PanResponder: { create: () => ({ panHandlers: {} }) },
};
['View','Text','TouchableOpacity','ScrollView','TextInput','KeyboardAvoidingView','Image','Modal','ActivityIndicator','FlatList','RefreshControl','StatusBar','Switch'].forEach(name => { native[name] = name; });
const cache = new Map();
function load(filename) {
  filename = path.resolve(filename);
  if (/\.(png|jpg)$/.test(filename)) return filename;
  if (!path.extname(filename)) filename += '.js';
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename, module);
  const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    plugins: [dependency.resolve('@babel/plugin-transform-modules-commonjs'), [dependency.resolve('@babel/plugin-transform-react-jsx'), { runtime: 'classic' }]],
  }).code;
  const localRequire = name => {
    if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name));
    if (name === 'react') return react;
    if (name === 'react-native') return native;
    if (name === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
    if (name === '@react-navigation/native') return { useNavigation: () => navigation, useFocusEffect: () => {} };
    if (name === '@react-navigation/bottom-tabs') return { createBottomTabNavigator: () => ({ Navigator: 'TabNavigator', Screen: 'TabScreen' }) };
    if (name === '@react-navigation/native-stack') return { createNativeStackNavigator: () => ({ Navigator: 'StackNavigator', Screen: 'StackScreen' }) };
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 24, bottom: 34, left: 0, right: 0 }) };
    if (name === '@react-native-async-storage/async-storage') return { getItem: async () => null };
    if (name === 'react-native-calendars') return { Calendar: 'Calendar' };
    if (name === 'expo-image-picker') return {};
    if (name === '@react-native-community/datetimepicker') return 'DateTimePicker';
    throw new Error(`Add an explicit test stub for ${name}`);
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(localRequire, module, module.exports);
  return module.exports;
}
function all(element) {
  if (!element || typeof element !== 'object') return [];
  return [element, ...[element.props?.children].flat(Infinity).flatMap(all)];
}
function text(element) { return typeof element === 'string' ? element : [element?.props?.children].flat(Infinity).map(x => typeof x === 'string' ? x : x && typeof x === 'object' ? text(x) : '').join(''); }
const component = name => load(path.join(appRoot, 'src', name)).default;

test('Android Back dismisses a confirmation without executing the destructive action', () => {
  let confirmed = 0, dismissed = 0;
  const Modal = component('components/CustomAlertModal.js');
  const tree = Modal({ visible: true, title: 'Cancel appointment?', primaryText: 'Cancel appointment', secondaryText: 'Keep appointment', onPrimaryPress: () => confirmed++, onSecondaryPress: () => dismissed++ });
  tree.props.onRequestClose();
  assert.equal(confirmed, 0); assert.equal(dismissed, 1);
  all(tree).find(n => n.type === 'TouchableOpacity' && text(n) === 'Cancel appointment').props.onPress();
  assert.equal(confirmed, 1);
});

test('failed OTP delivery offers resend and blocks verification', () => {
  const tree = component('screens/OtpVerificationScreen.js')({ navigation, route: { params: { email: 'test@example.test', generatedOtp: '', deliveryError: 'Failed to send email.' } } });
  assert.ok(text(tree).includes('Failed to send email.'));
  assert.ok(!text(tree).includes('Sent to test@example.test'));
  const nodes = all(tree);
  assert.equal(nodes.find(n => n.type === 'TouchableOpacity' && text(n).includes('Verify & Proceed')).props.disabled, true);
  assert.equal(nodes.find(n => n.type === 'TouchableOpacity' && text(n).includes('Resend Code')).props.disabled, false);
  assert.equal(nodes.filter(n => n.type === 'TextInput' && n.props.editable === false).length, 6);
});

test('OTP fields fit a 320px screen and keep verification disabled until all digits are entered', () => {
  const tree = component('screens/OtpVerificationScreen.js')({ navigation, route: { params: { email: 'test@example.test', generatedOtp: '123456' } } });
  const nodes = all(tree), inputs = nodes.filter(n => n.type === 'TextInput');
  assert.equal(inputs.length, 6);
  inputs.forEach(n => { assert.equal(n.props.style[0].flex, 1); assert.equal(n.props.style[0].width, undefined); });
  assert.equal(nodes.find(n => n.type === 'TouchableOpacity' && text(n).includes('Verify & Proceed')).props.disabled, true);
  assert.ok(nodes.some(n => n.type === 'ScrollView'));
});

test('welcome actions retain the login and registration destinations', () => {
  calls.length = 0;
  const tree = component('screens/LandingScreen.js')({ navigation });
  const nodes = all(tree);
  assert.ok(nodes.some(n => n.type === 'ScrollView'));
  nodes.find(n => n.type === 'TouchableOpacity' && text(n).includes('Log in')).props.onPress();
  nodes.find(n => n.type === 'TouchableOpacity' && text(n).includes('Create an account')).props.onPress();
  assert.deepEqual(calls, [['Login'], ['Register']]);
});

test('bottom tabs reserve the system inset and reset Profile to an existing screen', () => {
  const tree = component('navigation/MainTabNavigator.js')();
  const options = tree.props.screenOptions({ route: { name: 'Profile' } });
  assert.equal(options.tabBarStyle.paddingBottom, 34);
  assert.ok(options.tabBarStyle.height >= 34 + 60);
  calls.length = 0;
  all(tree).find(n => n.props?.name === 'Profile').props.listeners({ navigation }).tabPress({});
  assert.deepEqual(calls, [['Profile', { screen: 'ProfileMain' }]]);
});
