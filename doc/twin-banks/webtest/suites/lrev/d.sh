# d.sh: helpers to drive the review page.  PORT env selects the driver.
P=${PORT:-9911}
D=/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/lrev
req() { curl -s localhost:$P -d "$1"; }
brief() { python3 -c "
import json,sys
d=json.load(sys.stdin)
if 'error' in d: print('ERROR',d['error']); sys.exit()
s=d['st']
print('MSG:',s['msg'].replace(chr(10),' | '))
st=s['status'].split(chr(10)); print('ST:',' / '.join(x for x in st[2:5]))
print('more',s['more'],'modal',s['modal'],s['modalTitle'] if s['modal'] else '','form',s['form'],'wait',s['waiting'],'cmdWait',s['commandWait'],'layer',s['layer'],'fan',s['fan'],'armed',s['armed'],'ans',s['answering'],'drawer',s['drawer'],'pick',s['picking'],'scrim',s['scrim'],'pill',repr(s['pill']))
print('guard',s['guard'][-3:],'cursor',s['cursor'])
if s['modal']: print('MODAL:',s['modalText'][:600].replace(chr(10),' | '))
if d.get('errors'): print('ERRORS',d['errors'])
if d.get('out') is not None: print('OUT',json.dumps(d['out'])[:1500])
"; }
cap() { req "{\"op\":\"eval\",\"wait\":0,\"js\":\"(()=>{const r=globalThis.__bt.overlay.twinCapRect('$1');return [r.x+r.width/2,r.y+r.height/2,r.x,r.y,r.width,r.height];})()\"}" | python3 -c "import json,sys;print(*json.load(sys.stdin)['out'])"; }
k() { read cx cy rest <<< "$(cap $1)"; req "{\"op\":\"tap\",\"x\":$cx,\"y\":$cy,\"hold\":${2:-0},\"wait\":${3:-400}}" | brief; }
tap() { req "{\"op\":\"tap\",\"x\":$1,\"y\":$2,\"hold\":${3:-0},\"wait\":${4:-400}}" | brief; }
key() { req "{\"op\":\"key\",\"k\":\"$1\",\"wait\":${2:-400}}" | brief; }
shot() { req "{\"op\":\"shot\",\"path\":\"$D/shots/$1.png\",\"wait\":${2:-200}}" > /dev/null; echo $D/shots/$1.png; }
st() { req '{"op":"sleep","ms":0,"wait":0}' | brief; }
ev() { req "{\"op\":\"eval\",\"wait\":0,\"js\":$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$1")}" | python3 -c "import json,sys;d=json.load(sys.stdin);print(json.dumps(d.get('out'),indent=None)[:3000] if 'out' in d else d)"; }
map() { req '{"op":"eval","wait":0,"js":"(()=>{const g=globalThis.__bt.grid,c=globalThis.__bt.cursor;return g.map((row,y)=>row.map((q,x)=>x===c.x&&y===c.y?\"@\":String.fromCharCode(q.ch)).join(\"\").replace(/\\s+$/,\"\")).join(\"\\n\");})()"}' | python3 -c "import json,sys;d=json.load(sys.stdin);print('\n'.join(l for l in d['out'].split('\n')) if 'out' in d else d)"; }
cellxy() { req "{\"op\":\"eval\",\"wait\":0,\"js\":\"(()=>{const v=globalThis.__bt.view,r=document.getElementById('map').getBoundingClientRect();return [r.left+v.left+($1+0.5)*v.T, r.top+v.top+($2+0.5)*v.T];})()\"}" | python3 -c "import json,sys;print(*json.load(sys.stdin)['out'])"; }
cell() { read cx cy <<< "$(cellxy $1 $2)"; tap $cx $cy ${3:-0} ${4:-400}; }
