// Deterministic request and interaction regressions. No live accounts or server writes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const dependency = createRequire(path.join(process.env.ORAVISTA_TEST_DEPS || root, 'package.json'));
const babel = dependency('@babel/core');
const React = dependency('react');
const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const cleanups = [];
function harness() {
  cleanups.push(() => { for (const cell of cells) cell?.cleanup?.(); });
  let cells = [], cursor = 0, effects = [], cache = new Map(), tree, renderFn;
  const storage = new Map([['userData', JSON.stringify({ id: 7, email: 'patient@example.test' })]]);
  const calls = [], links = [], alerts = [];
  const navigation = { navigate: (...args) => calls.push(args), replace: (...args) => calls.push(args), reset: (...args) => calls.push(args), goBack: () => calls.push(['back']), getParent: () => navigation };
  const react = { ...React,
    useState: initial => {
      const index = cursor++;
      if (!(index in cells)) cells[index] = typeof initial === 'function' ? initial() : initial;
      return [cells[index], value => { cells[index] = typeof value === 'function' ? value(cells[index]) : value; }];
    },
    useRef: initial => { const index = cursor++; return cells[index] ?? (cells[index] = { current: initial }); },
    useCallback: f => f, useMemo: f => f(),
    useEffect: (f, deps) => {
      const index = cursor++, previous = cells[index];
      if (!previous || deps?.some((d, i) => d !== previous.deps?.[i])) {
        previous?.cleanup?.(); const value = { deps }; cells[index] = value;
        effects.push(() => { value.cleanup = f(); });
      }
    },
  };
  const native = { StyleSheet: { create: x => x }, Platform: { OS: 'android' },
    Dimensions: { get: () => ({ width: 320, height: 640 }) },
    Linking: { openURL: async url => links.push(url) }, Alert: { alert: (...args) => alerts.push(args) },
    Animated: { View: 'AnimatedView', Value: class {}, timing: () => ({ start() {} }) },
    PanResponder: { create: () => ({ panHandlers: {} }) },
  };
  for (const name of ['View','Text','TouchableOpacity','ScrollView','TextInput','Image','Modal','ActivityIndicator','FlatList','RefreshControl','StatusBar','KeyboardAvoidingView','Switch']) native[name] = name;
  const mocks = {
    react, 'react-native': native,
    'expo-print': {printToFileAsync: async () => ({uri:'file:///report.pdf'})},
    'expo-sharing': {isAvailableAsync: async () => true, shareAsync: async () => {}},
    '@expo/vector-icons': { Ionicons: 'Icon' },
    '@react-navigation/native': { useNavigation: () => navigation, useFocusEffect: f => react.useEffect(f, []) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 34 }) },
    '@react-native-async-storage/async-storage': { getItem: async key => storage.get(key) || null, setItem: async (key, value) => storage.set(key, value), removeItem: async key => storage.delete(key), multiRemove: async keys => keys.forEach(key => storage.delete(key)) },
    'react-native-calendars': { Calendar: 'Calendar' },
    'expo-image-picker': { requestMediaLibraryPermissionsAsync: async () => ({ granted: true }), launchImageLibraryAsync: async () => ({ canceled: false, assets: [{ uri: 'file:///photo.jpg', mimeType: 'image/jpeg' }] }) },
  };
  function load(filename) {
    filename = path.resolve(root, filename);
    if (/\.(png|jpg)$/.test(filename)) return filename;
    if (!path.extname(filename)) filename += '.js';
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename, module);
    const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), { filename, configFile: false, babelrc: false, plugins: [dependency.resolve('@babel/plugin-transform-modules-commonjs'), [dependency.resolve('@babel/plugin-transform-react-jsx'), { runtime: 'classic' }]] }).code;
    const requireLocal = name => name.startsWith('.') ? load(path.resolve(path.dirname(filename), name)) : mocks[name] || (() => { throw new Error(`Missing stub: ${name}`); })();
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(requireLocal, module, module.exports);
    return module.exports;
  }
  function render() { cursor = 0; tree = renderFn(); return tree; }
  return { load, calls, links, alerts, storage,
    mount: (name, props = {}) => { const Component = load(`src/screens/${name}.js`).default; renderFn = () => Component({ navigation, ...props }); return render(); },
    render, runEffects: async () => { for (const effect of effects.splice(0)) effect(); await flush(); return render(); },
    dispose: () => { for (const cell of cells) cell?.cleanup?.(); },
    tree: () => tree,
  };
}
function all(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
}
function text(node) { return typeof node === 'string' ? node : [node?.props?.children].flat(Infinity).map(n => typeof n === 'string' || typeof n === 'number' ? String(n) : n && typeof n === 'object' ? text(n) : '').join(''); }
const button = (h, label) => all(h.tree()).find(n => n.type === 'TouchableOpacity' && text(n) === label);
const alert = h => all(h.tree()).find(n => n.props?.visible && n.props?.title && n.props?.onPrimaryPress);
const errorView = h => all(h.tree()).find(n => n.props?.message && n.props?.onRetry);
test.afterEach(() => { for (const cleanup of cleanups.splice(0)) cleanup(); global.fetch = originalFetch; });
const originalFetch = global.fetch;


test('mobile has the same sex options as web and derives read-only age from DOB',async()=>{
 const h=harness();let payload;
 global.fetch=async(url,options)=>url.includes('user-profile')?response({id:7,email:'patient@example.test',first_name:'Test',last_name:'Patient',dob:null,age:99,sex:'Male',occupation:'',allergies:'Preserve'}):(payload=JSON.parse(options.body),response({message:'Saved'}));
 h.mount('EditProfileScreen');await h.runEffects();
 let age=all(h.tree()).find(n=>n.props?.accessibilityLabel==='Age');assert.equal(age.props.editable,false);assert.equal(age.props.onChangeText,undefined);assert.equal(age.props.value,'');
 const sex=all(h.tree()).find(n=>n.props?.accessibilityRole==='button'&&n.props?.accessibilityLabel==='Select Sex');sex.props.onPress();h.render();
 const options=all(h.tree()).filter(n=>n.props?.accessibilityRole==='radio');assert.deepEqual(options.map(n=>n.props.accessibilityLabel),['Select Sex (blank)','Male','Female']);
 options.find(n=>n.props.accessibilityLabel==='Female').props.onPress();h.render();
 all(h.tree()).find(n=>n.props?.accessibilityLabel==='YYYY-MM-DD').props.onChangeText('2000-01-02');h.render();
 const {profileAge}=h.load('src/utils/profileFields.js');age=all(h.tree()).find(n=>n.props?.accessibilityLabel==='Age');assert.equal(age.props.value,String(profileAge('2000-01-02')));
 await button(h,'Save Changes').props.onPress();h.render();
 assert.deepEqual(payload,{id:7,dob:'2000-01-02',sex:'Female'});assert.equal(JSON.parse(h.storage.get('userData')).age,profileAge('2000-01-02'));assert.equal(JSON.parse(h.storage.get('userData')).allergies,'Preserve');
});
test('mobile refresh does not overwrite a profile saved while the network response was pending',async()=>{
 const h=harness();const {refreshUserProfile}=h.load('src/utils/userProfile.js');let finish;
 global.fetch=()=>new Promise(resolve=>{finish=resolve;});
 const pending=refreshUserProfile(JSON.parse(h.storage.get('userData')));await flush();
 h.storage.set('userData',JSON.stringify({id:7,email:'patient@example.test',occupation:'Just saved'}));
 finish(response({id:7,email:'patient@example.test',occupation:'Stale response'}));assert.equal(await pending,null);assert.equal(JSON.parse(h.storage.get('userData')).occupation,'Just saved');
});
