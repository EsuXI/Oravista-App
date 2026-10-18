const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
function setup() {
  const cached = { id: 7, email: 'old@example.test', firstName: 'Old', first_name: 'Old', occupation: 'Old job', profile_picture: 'old.png' };
  const store = new Map([['userData',JSON.stringify(cached)],['userToken','session-one']]);
  let result = { id:7, email:'new@example.test', first_name:'New', last_name:'Patient', occupation:'Student', profile_picture:'uploads/new.png', dob:'2000-01-02T00:00:00.000Z', password:'never-cache' };
  let request;
  const storage = { getItem: async key => store.get(key) || null, setItem: async (key,value) => store.set(key,value) };
  const requestJson = async url => { request=url; if (result instanceof Error) throw result; return await result; };
  const module = { exports:{} };
  const code = babel.transformSync(fs.readFileSync(path.join(__dirname,'../src/utils/userProfile.js'),'utf8'), {configFile:false,babelrc:false,plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]}).code;
  const mocks = {'@react-native-async-storage/async-storage':storage,'../config/config':{API_BASE_URL:'https://api.example.test'},'./patientData':{requestJson,dateKey:v=>typeof v==='string'?v.slice(0,10):''}};
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(name=>mocks[name],module,module.exports);
  return { cached,store,refresh:module.exports.refreshUserProfile,respond:value=>{result=value;},request:()=>request };
}
test('web changes refresh by stable patient ID and synchronize mobile aliases without caching server secrets',async()=>{
  const h=setup();const result=await h.refresh(h.cached);
  assert.equal(h.request(),'https://api.example.test/api/user-profile?userId=7');
  assert.equal(result.email,'new@example.test');assert.equal(result.occupation,'Student');
  assert.equal(result.firstName,'New');assert.equal(result.first_name,'New');assert.equal(result.dob,'2000-01-02');
  assert.equal(result.profile_picture,'uploads/new.png');assert.equal(result.profile_image,'uploads/new.png');
  assert.equal(result.password,undefined);assert.equal(JSON.parse(h.store.get('userData')).occupation,'Student');
});
test('failed refresh preserves cached profile and rejects another patient response',async()=>{
  const h=setup();h.respond(new Error('Offline'));
  await assert.rejects(h.refresh(h.cached),/Offline/);assert.equal(JSON.parse(h.store.get('userData')).occupation,'Old job');
  h.respond({id:8,occupation:'Other'});await assert.rejects(h.refresh(h.cached),/signed-in account/);
  assert.equal(JSON.parse(h.store.get('userData')).id,7);
});
test('a response arriving after logout or account switch cannot restore the old session',async()=>{
  for(const change of ['logout','switch','new-session']){
    const h=setup();let finish;h.respond(new Promise(resolve=>{finish=resolve;}));
    const pending=h.refresh(h.cached);await Promise.resolve();
    if(change==='logout')h.store.delete('userData');
    if(change==='switch')h.store.set('userData',JSON.stringify({id:8,email:'other@example.test'}));
    if(change==='new-session')h.store.set('userToken','session-two');
    finish({id:7,occupation:'Late update'});assert.equal(await pending,null);
    assert.notEqual(h.store.get('userData') && JSON.parse(h.store.get('userData')).occupation,'Late update');
  }
});
test('cleared optional fields and photo remain cleared instead of falling back to stale cached values',async()=>{
  const h=setup();h.respond({id:7,first_name:'New',last_name:'Patient',occupation:null,dob:null,profile_picture:null});
  const result=await h.refresh(h.cached);assert.equal(result.occupation,null);assert.equal(result.dob,'');assert.equal(result.profile_picture,null);assert.equal(result.profile_image,null);
});
