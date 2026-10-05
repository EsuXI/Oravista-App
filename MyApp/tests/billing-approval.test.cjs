const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/utils/patientData.js'),'utf8');
const api=()=>import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('billing preserves approval and falls back without charging unapproved bookings',async()=>{
 const old=global.fetch;
 try {
 const {loadBillings}=await api();
 for(const [status,total] of [['Pending',0],['Approved',750],['Paid',0]]) {
 global.fetch=async()=>({ok:true,status:200,json:async()=>({records:[{id:1,status}],totalOutstanding:total})});
 const result=await loadBillings('https://test',7);assert.equal(result.records[0].status,status);assert.equal(result.totalOutstanding,total);
 }
 let count=0;global.fetch=async()=>++count===1?{ok:false,status:404,json:async()=>({})}:{ok:true,status:200,json:async()=>[
 {id:1,amount:2000,billing_status:'Pending'},
 {id:2,amount:1000,billing_status:'Approved',receipt_details:{paid:250}},
 {id:3,amount:1000,billing_status:'Paid'},
 ]};
 const result=await loadBillings('https://test',7);assert.equal(result.totalOutstanding,750);assert.equal(result.records[1].status,'Approved');
 } finally {global.fetch=old;}
});

test('breakdown distinguishes charge, partial payment and remaining balance',async()=>{
 const {billingBreakdown}=await api();
 assert.deepEqual(billingBreakdown({amount:1000,paid:250,balance:750,status:'Approved'}),{charge:1000,paid:250,balance:750,paymentStatus:'Partially paid'});
 assert.equal(billingBreakdown({amount:500,paid:500,balance:0,status:'Paid'}).paymentStatus,'Fully paid');
 assert.equal(billingBreakdown({amount:1000,paid:0,balance:1000,status:'Approved'}).paymentStatus,'Unpaid');
 assert.equal(billingBreakdown({amount:1000,status:'Approved'}).paid,null);
 assert.equal(billingBreakdown({amount:1000,receipt_details:{paid:250},status:'Approved'}).balance,750);
});
