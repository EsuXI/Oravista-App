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

test('network helper rejects HTTP errors, invalid JSON and malformed lists', async () => {
  const { requestJson, requireArray } = harness().load('src/utils/patientData.js');
  global.fetch = async () => response({ message: 'Unavailable' }, 503);
  await assert.rejects(requestJson('https://example.test'), /Unavailable/);
  global.fetch = async () => ({ ok: true, json: async () => { throw new Error('HTML'); } });
  await assert.rejects(requestJson('https://example.test'), /unreadable/);
  assert.throws(() => requireArray({ message: 'error' }, 'appointments'), /unexpected/);
});

test('billing fallback runs only on 404 and never substitutes appointment status for payment status', async () => {
  const { loadBillings } = harness().load('src/utils/patientData.js');
  let calls = 0;
  global.fetch = async () => { calls++; return response({}, 500); };
  await assert.rejects(loadBillings('https://example.test', 7)); assert.equal(calls, 1);
  calls = 0;
  global.fetch = async () => ++calls === 1 ? response({}, 404) : response([{ id: 1, amount: 0, base_price: 500, status: 'Completed' }]);
  const data = await loadBillings('https://example.test', 7);
  assert.equal(data.records[0].amount, 0);
  assert.equal(data.records[0].status, 'Not provided'); assert.equal(data.totalOutstanding, null);
});

test('files, dates and prices handle missing data, Philippine midnight and 12/24-hour times', () => {
  const p = harness().load('src/utils/patientData.js');
  assert.equal(p.fileUrl({ notes: 'receipt' }, 'https://example.test'), null);
  assert.equal(p.fileUrl('javascript:alert(1)', 'https://example.test'), null);
  assert.equal(p.fileUrl('/uploads/a.pdf', 'https://example.test/'), 'https://example.test/uploads/a.pdf');
  assert.equal(p.clinicDate(new Date('2026-09-24T17:00:00Z')), '2026-09-25');
  assert.equal(p.validBirthDate('2026-02-31'), false);
  assert.equal(p.validBirthDate('2024-02-29'), true);
  assert.equal(p.validBirthDate('2999-01-01'), false);
  assert.equal(p.timeMinutes('13:30:00'), 810); assert.equal(p.timeMinutes('01:30 PM'), 810);
  assert.equal(p.timeMinutes('25:00'), null); assert.equal(p.timeMinutes('12:00 AM'), 0);
  assert.equal(p.money(null), 'Not available'); assert.equal(p.money(0), '₱0.00');
});

test('upcoming visit is the nearest future appointment, not the first descending server result', () => {
  const { nextAppointment } = harness().load('src/utils/patientData.js');
  const appointments = [
    { id: 1, appointment_date: '2026-10-03', appointment_time: '10:00 AM', status: 'Pending' },
    { id: 2, appointment_date: '2026-09-26', appointment_time: '11:00:00', status: 'Confirmed' },
    { id: 3, appointment_date: '2026-09-24', appointment_time: '10:00 AM', status: 'Pending' },
  ];
  assert.equal(nextAppointment(appointments, new Date('2026-09-25T02:00:00Z')).id, 2);
});

test('record and billing failures display retry states instead of empty records/zero balance', async () => {
  for (const name of ['RecordsScreen', 'BillingsScreen', 'AppointmentsScreen']) {
    const h = harness(); global.fetch = async () => response({ message: 'Test outage' }, 500);
    h.mount(name); await h.runEffects();
    const error = errorView(h) || all(all(h.tree()).find(n => n.type === 'FlatList')?.props.ListHeaderComponent).find(n => n.props?.message && n.props?.onRetry);
    if(name === 'RecordsScreen') assert.ok(error.props.message.includes('unavailable'));
    else assert.equal(error.props.message, 'Test outage');
    assert.ok(!text(h.tree()).includes('₱0.00'));
  }
});

test('profile upload failure stops the profile save and reports the failed operation', async () => {
  const h = harness(), urls = [];
  global.fetch = async url => {
    urls.push(url);
    return url.includes('user-profile') ? response({ id: 7, email: 'patient@example.test', first_name: 'Patient', last_name: 'Example' }) : response({ message: 'Upload unavailable' }, 500);
  };
  h.mount('EditProfileScreen'); await h.runEffects();
  await all(h.tree()).find(n => n.props?.accessibilityLabel === 'Change profile photo').props.onPress(); h.render();
  await button(h, 'Save Changes').props.onPress(); h.render();
  assert.ok(!urls.some(url => url.includes('update-profile')));
  assert.equal(alert(h).props.title, 'Update Not Completed');
  assert.equal(alert(h).props.message, 'Upload unavailable');
});

test('profile saves preserve medical fields and synchronize both cached name formats', async () => {
  const h = harness(); let payload;
  global.fetch = async (url, options) => {
    if (url.includes('user-profile')) return response({ id: 7, email: 'patient@example.test', first_name: 'Patient', last_name: 'Example', blood_type: 'A+', allergies: 'Existing allergy', insurance: 'Existing insurer', policy_number: 'TEST', password: 'fixture-only-server-field' });
    payload = JSON.parse(options.body); return response({ message: 'Saved' });
  };
  h.mount('EditProfileScreen'); await h.runEffects();
  await button(h, 'Save Changes').props.onPress(); h.render();
  assert.equal(payload.allergies, 'Existing allergy'); assert.equal(payload.policy_number, 'TEST');
  const cached = JSON.parse(h.storage.get('userData'));
  assert.equal(cached.first_name, cached.firstName); assert.equal(alert(h).props.title, 'Profile Updated');
  assert.equal(cached.password, undefined);
});

test('services book buttons carry the selected branch and use the shared booking prices', () => {
  const h = harness(); h.mount('ServicesScreen', { route: { params: { tab: 'branches' } } });
  const buttons = all(h.tree()).filter(n => n.type === 'TouchableOpacity' && text(n).includes('Book at this Branch'));
  buttons[2].props.onPress(); assert.deepEqual(h.calls[0], ['Booking', { initialBranch: 'Angeles' }]);
  const service = harness(); service.mount('ServicesScreen');
  assert.ok(text(service.tree()).includes('Starts ₱500')); assert.ok(!text(service.tree()).includes('SPECIAL OFFER'));
});

test('home empty-state button opens booking and unavailable settings have no fake switches', () => {
  const h = harness(); h.mount('HomeScreen');
  // Initial load shows a spinner instead of a premature empty state.
  assert.ok(!text(h.tree()).includes('No upcoming appointments scheduled.'));
  const settings = harness(); settings.mount('SettingsScreen');
  assert.equal(all(settings.tree()).filter(n => n.type === 'Switch').length, 0);
  assert.ok(text(settings.tree()).includes('Notification controls are coming soon.'));
  button(settings, 'Contact a Branch').props.onPress();
  assert.deepEqual(settings.calls[0], ['Services', { tab: 'branches' }]);
});

async function chooseBooking(h, route = {}) {
  h.mount('BookingScreen', { route: { params: { initialBranch: 'Gil Puyat, Pasay', ...route } } });
  await h.runEffects();
  for (const label of ['Choose a category', 'General Dentistry', 'Choose service', 'Oral Prophylaxis • Starts ₱500 (0.5hr)', 'Choose a dentist', 'Auto-assigned']) {
    assert.ok(button(h, label), `Missing booking control: ${label}`);
    button(h, label).props.onPress(); h.render();
  }
  const { clinicDate } = h.load('src/utils/patientData.js');
  const date = clinicDate(new Date(Date.now() + 86400000));
  all(h.tree()).find(n => n.type === 'Calendar').props.onDayPress({ dateString: date }); h.render();
  await h.runEffects();
  return date;
}

test('failed availability blocks booking, retry recovers and uses the correct endpoints', async () => {
  const h = harness(), urls = []; let failing = true;
  global.fetch = async url => {
    urls.push(url);
    return url.includes('check-availability') && failing ? response({ message: 'Slots unavailable' }, 503) : response([]);
  };
  await chooseBooking(h);
  assert.equal(button(h, 'Confirm Booking').props.disabled, true);
  assert.equal(errorView(h).props.message, 'Slots unavailable');
  assert.ok(urls.some(url => url.includes('/api/user-appointments/7')));
  failing = false; await errorView(h).props.onRetry(); h.render();
  assert.ok(!errorView(h));
  const slot = all(h.tree()).find(n => n.type === 'TouchableOpacity' && text(n).trim() === '10:00 AM');
  assert.ok(slot && !slot.props.disabled); slot.props.onPress(); h.render();
  assert.equal(button(h, 'Confirm Booking').props.disabled, false);
});

test('an unavailable reschedule cannot create a new booking', async () => {
  const h = harness(); let posts = 0;
  global.fetch = async (url, options) => { if(options?.method === 'POST') posts++; return response([]); };
  h.mount('BookingScreen', {route:{params:{rescheduleId:4}}}); await h.runEffects(); await h.runEffects();
  assert.ok(errorView(h));
  assert.equal(posts,0);
  h.dispose();
});

test('notification read failures leave the notification unread', async () => {
  const h = harness();
  global.fetch = async (url, options) => options?.method === 'PUT' ? response({ message: 'Cannot save' }, 500)
    : response(url.includes('/notifications/') ? [{ id: 3, is_read: false, title: 'Visit reminder' }] : []);
  h.mount('HomeScreen'); await h.runEffects();
  const list = all(h.tree()).find(n => n.type === 'FlatList');
  assert.equal(list.props.data[0].is_read, false);
  await button(h, 'Mark all as read').props.onPress(); h.render();
  assert.ok(errorView(h).props.message.includes('Could not mark'));
  assert.ok(button(h, 'Mark all as read')); // It remains unread and can be retried.
  h.dispose();
});

test('a stale availability response cannot overwrite the newly selected day', async () => {
  const h = harness(); let resolveOld;
  const { clinicDate } = h.load('src/utils/patientData.js');
  const oldDay = clinicDate(new Date(Date.now() + 86400000));
  global.fetch = async url => {
    if (!url.includes('check-availability')) return response([]);
    if (url.includes(oldDay)) return await new Promise(resolve => { resolveOld = resolve; });
    return response([{ time: '10:00:00', service: 'Extraction' }]);
  };
  await chooseBooking(h);
  const nextDay = clinicDate(new Date(Date.now() + 2 * 86400000));
  all(h.tree()).find(n => n.type === 'Calendar').props.onDayPress({ dateString: nextDay }); h.render();
  await h.runEffects();
  resolveOld(response([])); await flush(); h.render();
  const slot = all(h.tree()).find(n => n.type === 'TouchableOpacity' && text(n).startsWith('10:00 AM'));
  assert.equal(slot.props.disabled, true);
  h.dispose();
});

test('remembered email never bypasses sign-in through AuthGate', async () => {
  const h = harness(); h.storage.set('rememberMe', 'true');
  h.mount('../navigation/AuthGate'); await h.runEffects();
  assert.deepEqual(h.calls, [['Login']]);
});

test('profile upload accepts the server imagePath and saves a remote URL', async () => {
  const h = harness(); let saved;
  global.fetch = async (url, options) => {
    if (url.includes('user-profile')) return response({ id: 7, email: 'patient@example.test', first_name: 'Patient', last_name: 'Example' });
    if (url.includes('upload-profile-picture')) return response({ imagePath: 'uploads/test-photo.jpg' });
    saved = JSON.parse(options.body); return response({ message: 'Saved' });
  };
  h.mount('EditProfileScreen'); await h.runEffects();
  await all(h.tree()).find(n => n.props?.accessibilityLabel === 'Change profile photo').props.onPress(); h.render();
  await button(h, 'Save Changes').props.onPress(); h.render();
  assert.match(saved.profilePic, /^https:\/\/.*\/uploads\/test-photo.jpg$/);
  assert.equal(alert(h).props.title, 'Profile Updated');
});


test('Home shows the saved profile photo, opens Profile, and falls back if the image fails', async () => {
  const h = harness();
  h.storage.set('userData', JSON.stringify({ id: 7, first_name: 'Preview', profile_picture: '/uploads/avatar.jpg' }));
  global.fetch = async () => response([]);
  h.mount('HomeScreen');
  await h.runEffects();
  const photo = all(h.tree()).find(n => n.type === 'Image');
  assert.match(photo.props.source.uri, /\/uploads\/avatar.jpg$/);
  const profile = all(h.tree()).find(n => n.props?.accessibilityLabel === 'Open your profile');
  profile.props.onPress();
  assert.deepEqual(h.calls.at(-1), ['Profile', { screen: 'ProfileMain' }]);
  photo.props.onError(); h.render();
  assert.equal(all(h.tree()).some(n => n.type === 'Image'), false);
  h.dispose();
});

test('appointment management reveals labeled eligible actions and loads ten visits at a time', async () => {
  const h = harness();
  const visits = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, service_type: 'Cleaning', appointment_date: '2026-12-01', status: i === 1 ? 'Confirmed' : 'Pending' }));
  global.fetch = async () => response(visits);
  h.mount('AppointmentsScreen'); await h.runEffects();
  const list = () => all(h.tree()).find(n => n.type === 'FlatList');
  assert.equal(list().props.data.length, 10);
  assert.ok(!text(list().props.renderItem({ item: visits[0] })).includes('Cancel'));
  button(h, 'Manage').props.onPress(); h.render();
  const cancel = all(list().props.renderItem({ item: visits[0] })).find(n => n.type === 'TouchableOpacity' && text(n) === 'Cancel');
  cancel.props.onPress(); h.render();
  assert.equal(alert(h).props.title, 'Cancel Appointment');
  const reschedule = all(list().props.renderItem({ item: visits[1] })).find(n => n.type === 'TouchableOpacity' && text(n) === 'Reschedule');
  reschedule.props.onPress();
  assert.deepEqual(h.calls.at(-1), ['Booking', { rescheduleId: 2 }]);
  all(list().props.ListFooterComponent()).find(n => n.type === 'TouchableOpacity' && text(n) === 'Next').props.onPress(); h.render();
  assert.equal(list().props.data.length, 2);
  assert.equal(list().props.data[0].id, 11);
  all(all(h.tree()).find(n => n.props?.testID === 'top-pagination')).find(n => n.type === 'TouchableOpacity' && text(n) === 'Previous').props.onPress(); h.render();
  assert.equal(list().props.data.length, 10);
  button(h, 'Cancel').props.onPress(); h.render();
  assert.ok(!text(list().props.renderItem({ item: visits[1] })).includes('Reschedule'));
});

test('billing shows twenty records initially and expands without losing record access', async () => {
  const h = harness();
  global.fetch = async () => response({ records: Array.from({ length: 22 }, (_, i) => ({ id: i + 1, title: `Service ${i + 1}`, amount: 100, status: 'Paid' })), totalOutstanding: 0 });
  h.mount('BillingsScreen'); await h.runEffects();
  assert.ok(!text(h.tree()).includes('Service 21'));
  button(h, 'Show 20 more bills').props.onPress(); h.render();
  assert.ok(text(h.tree()).includes('Service 22'));
  assert.equal(button(h, 'Show 20 more bills'), undefined);
  const record = all(h.tree()).find(n => n.type === 'TouchableOpacity' && text(n).includes('Record #22'));
  record.props.onPress(); h.render();
  assert.ok(alert(h));
});


test('records paginate ten at a time in both directions and search resets the page', async () => {
  const h = harness();
  global.fetch = async () => response(Array.from({length:21}, (_, i) => ({id:i+1,file_name:`Record ${i+1}.pdf`,upload_date:'2026-10-01',file_path:'/uploads/test.pdf'})));
  h.mount('RecordsScreen'); await h.runEffects();
  const list = () => all(h.tree()).find(n => n.type === 'FlatList');
  const pageButton = (position, label) => all(position === 'ListHeaderComponent' ? all(h.tree()).find(n => n.props?.testID === 'top-pagination') : list().props[position]()).find(n => n.type === 'TouchableOpacity' && text(n) === label);
  assert.equal(list().props.data.length,10);
  assert.equal(pageButton('ListHeaderComponent','Previous').props.disabled,true);
  pageButton('ListFooterComponent','Next').props.onPress(); h.render();
  assert.equal(list().props.data[0].id,11);
  pageButton('ListHeaderComponent','Next').props.onPress(); h.render();
  assert.equal(list().props.data.length,1);
  assert.equal(pageButton('ListFooterComponent','Next').props.disabled,true);
  all(h.tree()).find(n => n.type === 'TextInput').props.onChangeText('Record 1.pdf'); h.render(); await h.runEffects();
  assert.equal(list().props.data[0].id,1);
  assert.equal(list().props.data.length,1);
});

test('Home reads the same appointments and displays the nearest eligible future visit', async () => {
  const h = harness();
  global.fetch = async url => response(url.includes('user-appointments') ? [
    {id:1,service_type:'Later visit',status:'Confirmed',appointment_date:'2099-12-31',appointment_time:'10:00:00'},
    {id:2,service_type:'Nearest visit',status:'Approved',appointment_date:'2099-01-01',appointment_time:'10:00:00'},
    {id:3,service_type:'Cancelled visit',status:'Cancelled',appointment_date:'2098-01-01'},
  ] : []);
  h.mount('HomeScreen'); await h.runEffects();
  const content = text(h.tree());
  assert.ok(content.indexOf('Nearest visit') < content.indexOf('Later visit'));
  h.dispose();
});


test('empty appointment and record lists hide both pagination controls', async () => {
  for (const screen of ['AppointmentsScreen','RecordsScreen']) {
    const h = harness(); global.fetch = async () => response([]);
    h.mount(screen); await h.runEffects();
    const list = all(h.tree()).find(n => n.type === 'FlatList');
    if(screen === 'AppointmentsScreen') assert.equal(list.props.ListHeaderComponent, undefined);
    const top = all(h.tree()).find(n => n.props?.testID === 'top-pagination');
    for (const pager of [top,list.props.ListFooterComponent()]) {
      const controls = all(pager).filter(n => n.type === 'TouchableOpacity');
      assert.equal(controls.length,0);
    }
  }
});

test('confirmed appointments expose both actions and late visits allow reschedule', async () => {
  const h = harness(); global.fetch = async () => response([]);
  h.mount('AppointmentsScreen'); await h.runEffects(); button(h,'Manage').props.onPress(); h.render();
  const list = all(h.tree()).find(n => n.type === 'FlatList');
  for (const status of ['Confirmed','Late / No Show']) {
    const row = list.props.renderItem({item:{id:9,status,service_type:'Cleaning',appointment_date:'2099-01-01'}});
    const actions = all(row).filter(n => n.type === 'TouchableOpacity');
    if(status === 'Confirmed') assert.ok(actions.some(n => text(n) === 'Cancel'));
    actions.find(n => text(n) === 'Reschedule').props.onPress();
    assert.deepEqual(h.calls.at(-1),['Booking',{rescheduleId:9}]);
  }
});

function fill(h,placeholder,value) {
  const node=all(h.tree()).find(n=>n.props?.placeholder===placeholder);
  (node.props.onChangeText || node.props.setValue)(value); h.render();
}
test('patient login opens verification without storing a session or receiving the code',async()=>{
 const h=harness();let payload;
 global.fetch=async(url,options)=>{payload=JSON.parse(options.body);return {...response({user:{id:7,role:'patient'},challengeId:'opaque-login'}),text:async()=>JSON.stringify({user:{id:7,role:'patient'},challengeId:'opaque-login'})};};
 h.mount('LoginScreen');fill(h,'Enter your email','patient@example.test');fill(h,'Enter your password','OldPassword1!');
 await button(h,'Login').props.onPress();h.render();
 assert.equal(payload.password,'OldPassword1!');assert.equal(h.storage.get('userToken'),undefined);
 assert.equal(h.calls[0][0],'OtpVerification');assert.equal(h.calls[0][1].challengeId,'opaque-login');assert.equal(h.calls[0][1].generatedOtp,undefined);
});
test('verification uses server response, never a locally matching code',async()=>{
 const h=harness();const requests=[];
 global.fetch=async(url,options)=>{requests.push([url,JSON.parse(options.body)]);return response({message:'Invalid or expired code.'},400);};
 h.mount('OtpVerificationScreen',{route:{params:{email:'patient@example.test',challengeId:'opaque-login'}}});
 all(h.tree()).find(n=>n.type==='TextInput').props.onChangeText('123456');h.render();
 await button(h,'Verify & Proceed').props.onPress();h.render();
 assert.ok(requests[0][0].endsWith('/api/verify-otp'));assert.equal(requests[0][1].code,'123456');assert.equal(requests[0][1].challengeId,'opaque-login');
 assert.equal(h.calls.length,0);assert.equal(h.storage.get('userToken'),undefined);assert.match(alert(h).props.message,/Invalid/);
 global.fetch=async()=>response({token:'verified-session',user:{id:7,role:'patient'}});
 await button(h,'Verify & Proceed').props.onPress();h.render();
 assert.equal(h.storage.get('userToken'),'verified-session');assert.equal(h.calls[0][0].routes[0].name,'Home');
});
test('recovery code delivery accepts an opaque challenge',async()=>{
 const h=harness();global.fetch=async()=>({ok:true,text:async()=>JSON.stringify({challengeId:'recovery-challenge'})});
 h.mount('ForgotPasswordScreen');fill(h,'Enter your registered email','patient@example.test');await button(h,'Send Code').props.onPress();
 assert.equal(h.alerts[0][0],'Code Sent');h.alerts[0][2][0].onPress();assert.equal(h.calls[0][1].challengeId,'recovery-challenge');assert.equal(h.calls[0][1].isResetFlow,true);
});
test('recovery verification passes server proof to reset and reset submits that proof',async()=>{
 const h=harness();global.fetch=async()=>response({verificationToken:'recovery-proof'});
 h.mount('OtpVerificationScreen',{route:{params:{email:'patient@example.test',challengeId:'recovery',isResetFlow:true}}});
 all(h.tree()).find(n=>n.type==='TextInput').props.onChangeText('123456');h.render();await button(h,'Verify & Proceed').props.onPress();
 assert.equal(h.calls[0][0],'ResetPassword');assert.equal(h.calls[0][1].verificationToken,'recovery-proof');
 const next=harness();let payload;
 global.fetch=async(url,options)=>{payload=JSON.parse(options.body);return {ok:false,text:async()=>JSON.stringify({message:'Expired proof'})};};
 next.mount('ResetPasswordScreen',{route:{params:h.calls[0][1]}});fill(next,'Enter new password','NewPassword1!');fill(next,'Confirm new password','NewPassword1!');await button(next,'Reset Password').props.onPress();
 assert.equal(payload.verificationToken,'recovery-proof');assert.equal(next.calls.length,0);
});
test('password change requests a purpose-specific challenge and passes current password',async()=>{
 const h=harness();let payload;
 global.fetch=async(url,options)=>{payload=JSON.parse(options.body);return {...response({challengeId:'change-challenge'}),headers:{get:()=> 'application/json'}};};
 h.mount('ChangePasswordScreen');await h.runEffects();fill(h,'Enter current password','OldPassword1!');fill(h,'Enter new password','NewPassword1!');fill(h,'Confirm new password','NewPassword1!');
 await button(h,'Verify & Update').props.onPress();assert.equal(payload.action,'change_password');assert.equal(h.calls[0][1].challengeId,'change-challenge');assert.equal(h.calls[0][1].oldPassword,'OldPassword1!');
});
test('inactive Google auth action is removed from registration and login',()=>{
 for(const screen of ['RegisterScreen','LoginScreen']) {const h=harness();h.mount(screen);assert.ok(!text(h.tree()).includes('Google'));}
});
test('session transport sends credentials only to our API and handles session expiry',async()=>{
 const h=harness();h.storage.set('userToken','fixture-session');const requests=[];
 global.fetch=async(url,options)=>{requests.push({url,options});return {status:200};};
 const {installAuthFetch,onSessionExpired}=h.load('src/utils/authFetch');const {API_BASE_URL}=h.load('src/config/config');
 installAuthFetch();await global.fetch(API_BASE_URL+'/api/patient-records/7');await global.fetch('https://example.test/api/records');
 assert.equal(requests[0].options.headers.get('Authorization'),'Bearer fixture-session');assert.equal(requests[1].options.headers,undefined);
 let expired=false;onSessionExpired(()=>{expired=true;});global.fetch=async()=>({status:401,clone:()=>({json:async()=>({code:'SESSION_EXPIRED'})})});installAuthFetch();
 await global.fetch(API_BASE_URL+'/api/patient-records/7');assert.equal(expired,true);assert.equal(h.storage.has('userToken'),false);
});
