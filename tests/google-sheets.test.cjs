const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const code = fs.readFileSync('integrations/google-sheets.gs', 'utf8');
const headers = ['Họ tên', 'Điện thoại', 'Địa chỉ', 'Số máy', 'gói mua', 'thời gian đặt'];
function fixture(options = {}) {
  const rows = options.empty ? [] : [headers.slice()];
  if (options.oldSchema) rows[0] = ['Request ID', 'Họ tên'];
  const notes = new Map();
  let released = 0;
  const sheet = {
    getLastRow: () => rows.length,
    setFrozenRows() {},
    getRange(r, c, height = 1, width = 1) {
      return {
        getValues: () => Array.from({length: height}, (_, i) => Array.from({length: width}, (_, j) => rows[r - 1 + i]?.[c - 1 + j] || '')),
        getNotes: () => Array.from({length: height}, (_, i) => [notes.get(`${r+i}:${c}`) || '']),
        setValues(values) {
          values.forEach((row, i) => { rows[r - 1 + i] ||= []; row.forEach((v,j) => rows[r-1+i][c-1+j] = v); });
          return this;
        },
        setNumberFormat() { return this; },
        setFontWeight() { return this; },
        setNote(value) { notes.set(`${r}:${c}`, value); return this; }
      };
    }
  };
  const context = {
    PropertiesService: {getScriptProperties: () => ({getProperty: () => 'test-sheet'})},
    LockService: {getScriptLock: () => ({tryLock: () => !options.busy, hasLock: () => !options.busy, releaseLock: () => released++})},
    SpreadsheetApp: {openById: () => ({getSheets: () => [sheet]}), flush() {}},
    Utilities: {formatDate(date, zone, format) { assert.equal(zone,'Asia/Ho_Chi_Minh'); assert.equal(format,'dd/MM/yyyy HH:mm:ss'); return '02/11/2026 15:00:00'; }},
    ContentService: {MimeType: {JSON:'json'}, createTextOutput: body => ({body, setMimeType() {return this;}})}
  };
  vm.createContext(context); vm.runInContext(code, context);
  const base = {name:'Khách thử',phone:'0901234567',address:'123 Đường A, Hà Nội',packageId:'single',requestId:'request-test-00001'};
  const send = data => JSON.parse(context.doPost({postData:{contents:JSON.stringify({...base,...data})}}).body);
  return {rows, notes, send, released: () => released};
}
test('writes exactly six requested columns, preserves phone and uses server time', () => {
  const f=fixture(); assert.equal(f.send({timestamp:'fake',utm_source:'fb',total:1}).ok,true);
  assert.deepEqual(f.rows[1],['Khách thử','0901234567','123 Đường A, Hà Nội',1,'1 máy + tặng 10 túi — 339.000đ','02/11/2026 15:00:00']);
  assert.equal(f.released(),1);
});
test('uses package for quantity and normalizes +84', () => {
  const f=fixture(); assert.equal(f.send({packageId:'double',quantity:99,phone:'+84 901 234 567'}).ok,true);
  assert.equal(f.rows[1][1],'0901234567'); assert.equal(f.rows[1][3],2); assert.match(f.rows[1][4],/599.000/);
});
test('duplicate request does not add a second order or a seventh column', () => {
  const f=fixture(); f.send({}); assert.equal(f.send({}).duplicate,true); assert.equal(f.rows.length,2); assert.equal(f.rows[1].length,6); assert.equal(f.notes.get('2:6'),'requestId:request-test-00001');
});
test('invalid phone, package and address do not write orders', () => {
  for(const data of [{phone:'123'},{packageId:'__proto__'},{address:'ngắn'},{requestId:'bad'}]) {const f=fixture(); assert.equal(f.send(data).ok,false); assert.equal(f.rows.length,1);}
});
test('neutralizes spreadsheet formulas in text fields', () => {
  const f=fixture(); f.send({name:'=1+1',address:'=IMPORTXML("url","path")'}); assert.equal(f.rows[1][0],"'=1+1"); assert.equal(f.rows[1][2][0],"'");
});
test('refuses old headers without modifying existing rows', () => {const f=fixture({oldSchema:true});assert.equal(f.send({}).error,'sheet_headers_mismatch'); assert.equal(f.rows.length,1);});
test('initializes an empty sheet with the six headers', () => {const f=fixture({empty:true});assert.equal(f.send({}).ok,true);assert.equal(f.rows[0].length,6);assert.equal(f.rows[0][4],'Gói mua');});
test('busy lock does not write', () => {const f=fixture({busy:true});assert.equal(f.send({}).error,'busy_retry');assert.equal(f.rows.length,1);});
