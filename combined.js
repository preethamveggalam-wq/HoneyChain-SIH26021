



(() => {
const root=document.getElementById("root");
const AKEY="hc_stable_accounts",CAKEY="hc_stable_customer_accounts",SKEY="hc_stable_session",BKEY="hc_stable_batches",SALESKEY="hc_stable_sales";
const COUNTRY_OPTIONS=[
 ["+91","India"],["+1","United States / Canada"],["+44","United Kingdom"],["+61","Australia"],["+81","Japan"],["+49","Germany"],["+33","France"],["+39","Italy"],["+34","Spain"],["+971","United Arab Emirates"],["+966","Saudi Arabia"],["+974","Qatar"],["+968","Oman"],["+65","Singapore"],["+60","Malaysia"],["+65","Singapore"],["+64","New Zealand"],["+27","South Africa"],["+55","Brazil"],["+52","Mexico"],["+7","Russia / Kazakhstan"],["+82","South Korea"],["+86","China"],["+31","Netherlands"],["+32","Belgium"],["+41","Switzerland"],["+46","Sweden"],["+47","Norway"],["+45","Denmark"],["+358","Finland"],["+353","Ireland"],["+30","Greece"],["+90","Türkiye"],["+972","Israel"],["+20","Egypt"],["+234","Nigeria"],["+254","Kenya"],["+212","Morocco"],["+213","Algeria"],["+92","Pakistan"],["+880","Bangladesh"],["+977","Nepal"],["+94","Sri Lanka"],["+66","Thailand"],["+62","Indonesia"],["+63","Philippines"],["+84","Vietnam"],["+92","Pakistan"]
];
function countryOptions(selected){return COUNTRY_OPTIONS.map(([code,name])=>`<option value="${code}" ${selected===code?"selected":""}>${name} (${code})</option>`).join("")+`<option value="custom" ${selected==="custom"?"selected":""}>Other / Custom country code</option>`}
function saveSale(b){try{const rows=read(SALESKEY,[]);rows.unshift({batchId:b.batchId,customerName:b.customerName,customerPhone:b.customerPhone,countryCode:b.countryCode||"+91",honeyType:b.honeyType,quantity:Number(b.quantity)||0,totalAmount:Number(b.totalAmount)||0,registeredAt:b.registeredAt||new Date().toISOString()});write(SALESKEY,rows.slice(0,500))}catch(e){}}
function todaySales(){
 const day=new Date().toLocaleDateString("en-CA");
 const rows=read(SALESKEY,[]).filter(x=>x&&x.registeredAt&&new Date(x.registeredAt).toLocaleDateString("en-CA")===day);
 const known=new Set(rows.map(x=>String(x.batchId||"").toUpperCase()));
 Object.values(state?.batches||{}).forEach(b=>{
   if(!b||known.has(String(b.batchId||"").toUpperCase())||!b.registeredAt)return;
   if(new Date(b.registeredAt).toLocaleDateString("en-CA")===day){rows.push({batchId:b.batchId,customerName:b.customerName,customerPhone:b.customerPhone,countryCode:b.countryCode||"+91",honeyType:b.honeyType,quantity:Number(b.quantity)||0,totalAmount:Number(b.totalAmount)||0,registeredAt:b.registeredAt});}
 });
 return rows.sort((a,b)=>new Date(b.registeredAt)-new Date(a.registeredAt));
}
function formatPhone(countryCode,phone){const cc=String(countryCode||"").trim();const digits=String(phone||"").replace(/\D/g,"");if(!digits)return "";return `${cc.startsWith("+")?cc:"+"+cc}${digits}`}

const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const readSessionUser=()=>{
  try{
    const ss=sessionStorage.getItem(SKEY);
    if(ss)return JSON.parse(ss);
    const legacy=localStorage.getItem(SKEY);
    if(legacy){
      sessionStorage.setItem(SKEY,legacy);
      localStorage.removeItem(SKEY);
      return JSON.parse(legacy);
    }
  }catch(e){}
  return null;
};
const writeSessionUser=(u)=>{try{sessionStorage.setItem(SKEY,JSON.stringify(u));localStorage.removeItem(SKEY)}catch(e){}};
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const state={page:"home",user:readSessionUser(),accounts:read(AKEY,{}),customerAccounts:read(CAKEY,{}),authRole:"beekeeper",batches:read(BKEY,{}),auth:false,mode:"signin",authMsg:"",step:1,batch:{batchId:"",hiveId:"",harvestDate:"",manufactureDate:"",expiryDate:"",location:"",quantity:"",honeyType:"",quality:"",qualityPurity:"99.1",qualityMoisture:"17.2",qualityColour:"Golden Amber",qualityStatus:"Passed",customerName:"",countryCode:"+91",customerPhone:"",customerAddress:"",sendCustomerDetails:true,messageChannel:"sms",pricePerKg:0,totalAmount:0},batchMsg:"",verifyId:"",verified:null,qrData:"",qrScanner:null,qrScanLocked:false,scannedCustomer:null,scannedBatch:null,tracking:{beekeeper:{lat:null,lng:null,accuracy:null,live:false,updatedAt:null,error:""},truck:{lat:11.0175,lng:76.9558,accuracy:8,speed:36,live:true,updatedAt:new Date().toISOString()},sensor:{temperature:31.2,humidity:68,live:true,updatedAt:new Date().toISOString()},openBatchIds:[],selectedBatchId:null,batchFeeds:{},records:{}}};
let dashboardSensorTimer=null;

// Defensive normalization: older prototype sessions may have no batch store or a malformed value.
if(!state.accounts || typeof state.accounts!=="object") state.accounts={};
if(!state.customerAccounts || typeof state.customerAccounts!=="object") state.customerAccounts={};
if(!state.batches || typeof state.batches!=="object") state.batches={};
if(state.user && !state.user.role) state.user.role="beekeeper";
try{const q=new URLSearchParams(window.location.search);if(q.get("customerLogin")==="1"){setTimeout(()=>openAuth("signin","customer"),100)}}catch(e){}

let temperatureHistory=[30.4,30.7,30.8,30.6,30.9,31.1,30.9,31.2,31.4,31.1,31.5,31.3,31.6,31.8,31.5,31.7,31.4,31.9,31.6,31.8,31.5,31.7,31.9,31.6];
let dashboardSelectedBatchId=null;
function batchTemperatureBase(id){const text=String(id||"HC");let h=0;for(let i=0;i<text.length;i++)h=(h*33+text.charCodeAt(i))>>>0;return Number((29.8+(h%25)/10).toFixed(1));}
function resetDashboardTemperatureForBatch(id){
  const base=batchTemperatureBase(id); const now=Date.now()/1500;
  temperatureHistory=Array.from({length:24},(_,i)=>Number((base+Math.sin((now-(23-i))*0.22)*0.45+Math.cos((now-(23-i))*0.11)*0.18).toFixed(1)));
  state.tracking.sensor.temperature=temperatureHistory[temperatureHistory.length-1];
}



document.addEventListener("pointermove",e=>{document.documentElement.style.setProperty("--mx",e.clientX+"px");document.documentElement.style.setProperty("--my",e.clientY+"px")});

function nav(p){
  state.user=readSessionUser();
  if(state.user && !state.user.role) state.user.role="beekeeper";
  const role=state.user?.role||null;
  if(!state.user && (p==="dashboard"||p==="batch"||p==="tracking")){state.auth=true;state.authRole="beekeeper";state.mode="signin";state.authMsg="Please sign in to open this page.";render();return}
  if(role==="customer" && (p==="dashboard"||p==="batch")){state.page="verify";state.verified=null;render();return}
  if(role==="customer" && p==="tracking" && !state.tracking?.openBatchIds?.length){state.page="verify";state.verified=null;render();return}
  if(p!=="tracking") stopTracking();
  state.page=p;
  state.verified=null;
  render();
  window.scrollTo({top:0,behavior:"smooth"});
}
let geoWatch=null, trackTimer=null;
let leafletMap=null, beeMarker=null, sensorMarker=null;
let truckMarkers={}, truckLines={}, truckPaths={}, customerMarkers={}, customerLines={};
let truckPath=[];
let trackingMapFitted=false;
let truckDemoBound=false;

function stableOffset(id){
  const text=String(id||"HC");
  let h=0; for(let i=0;i<text.length;i++) h=(h*31+text.charCodeAt(i))>>>0;
  return {x:((h%15)-7)*0.004, y:(((Math.floor(h/15)%15)-7)*0.004)};
}
const customerGeocodeInFlight=new Set();
async function geocodeCustomerAddress(batchId){
  const key=String(batchId||"").toUpperCase();
  const batch=getTrackingBatch(key);
  if(!batch || !String(batch.customerAddress||"").trim()) return null;
  if(customerGeocodeInFlight.has(key)) return null;
  customerGeocodeInFlight.add(key);
  try{
    const raw=String(batch.customerAddress).trim();
    const addressLower=raw.toLowerCase();

    // High-confidence Hyderabad locality correction for common demo addresses.
    // Koti is a known Hyderabad locality; lock it to the locality coordinates
    // instead of allowing a global geocoder to choose another place named Koti.
    if(/\bkoti\b/.test(addressLower) && /\bhyderabad\b/.test(addressLower)){
      const lat=17.38564, lng=78.48371;
      batch.customerLat=lat; batch.customerLng=lng;
      batch.customerResolvedAddress="Koti, Hyderabad, Telangana, India";
      state.batches[key]=batch; write(BKEY,state.batches);
      const feed=state.tracking.batchFeeds[key];
      if(feed){feed.customerLat=lat;feed.customerLng=lng;}
      return {lat,lng,displayName:batch.customerResolvedAddress};
    }

    let query=raw;
    if(!/\btelangana\b/i.test(query) && /\bhyderabad\b/i.test(query)) query += ", Telangana";
    if(!/\bindia\b/i.test(query)) query += ", India";

    const params=new URLSearchParams({format:"jsonv2",limit:"5",addressdetails:"1",
      "accept-language":"en",countrycodes:"in",q:query});

    // Bias Hyderabad searches to Hyderabad so similarly named places elsewhere
    // in India are not selected by the geocoder.
    if(/\bhyderabad\b/i.test(query)) {
      params.set("viewbox","78.30,17.60,78.65,17.20");
      params.set("bounded","1");
    }

    const url=`https://nominatim.openstreetmap.org/search?${params.toString()}`;
    const response=await fetch(url,{headers:{"Accept":"application/json"}});
    if(!response.ok) throw new Error(`Geocoding request failed (${response.status})`);
    const results=await response.json();
    if(!Array.isArray(results)||!results.length) return null;

    const mustHyderabad=/\bhyderabad\b/i.test(raw);
    const mustTelangana=/\btelangana\b/i.test(raw);
    const ranked=[...results].sort((a,b)=>{
      const score=(r)=>{
        const text=String(r.display_name||"");
        return (mustHyderabad&&/\bhyderabad\b/i.test(text)?20:0)
          +(mustTelangana&&/\btelangana\b/i.test(text)?10:0)
          +(/\bindia\b/i.test(text)?3:0);
      };
      return score(b)-score(a);
    });
    const chosen=ranked[0];
    const lat=Number(chosen.lat), lng=Number(chosen.lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)) return null;

    // Safety guard: when the user explicitly says Hyderabad, never accept a
    // result outside the Hyderabad bounding area. This prevents the marker
    // from jumping to another city/locality with the same name.
    if(mustHyderabad && (lat<17.20 || lat>17.60 || lng<78.30 || lng>78.65)) {
      console.warn("Rejected out-of-area geocoder result",chosen);
      return null;
    }

    const resolved=chosen.display_name||batch.customerAddress;
    batch.customerLat=Number(lat.toFixed(6));
    batch.customerLng=Number(lng.toFixed(6));
    batch.customerResolvedAddress=resolved;
    state.batches[key]=batch;
    write(BKEY,state.batches);
    const feed=state.tracking.batchFeeds[key];
    if(feed){feed.customerLat=batch.customerLat;feed.customerLng=batch.customerLng;}
    return {lat:batch.customerLat,lng:batch.customerLng,displayName:resolved};
  }catch(error){
    console.warn("Could not geocode customer address",error);
    return null;
  }finally{
    customerGeocodeInFlight.delete(key);
  }
}
function getTrackingBatch(id){
  const key=String(id||"").toUpperCase();
  return state.batches?.[key] || state.tracking.records?.[key] || null;
}
function ensureTrackingBatch(id){
  if(!id)return;
  const key=String(id).toUpperCase();
  if(!state.tracking.openBatchIds.includes(key)) state.tracking.openBatchIds.push(key);
  if(!state.tracking.selectedBatchId) state.tracking.selectedBatchId=key;
  if(!state.tracking.batchFeeds[key]){
    const bee=state.tracking.beekeeper;
    const off=stableOffset(key);
    const baseLat=bee.live?bee.lat:11.0168, baseLng=bee.live?bee.lng:76.9558;
    const batch=getTrackingBatch(key)||{};
    const hasCustomerCoords=Number.isFinite(Number(batch.customerLat))&&Number.isFinite(Number(batch.customerLng));
    state.tracking.batchFeeds[key]={lat:Number((baseLat+0.035+off.x).toFixed(6)),lng:Number((baseLng+0.045+off.y).toFixed(6)),speed:32,live:true,updatedAt:new Date().toISOString(),path:[],customerLat:hasCustomerCoords?Number(batch.customerLat):null,customerLng:hasCustomerCoords?Number(batch.customerLng):null};
  }
  const batch=getTrackingBatch(key);
  if(batch?.customerAddress?.trim()) geocodeCustomerAddress(key).then(()=>refreshTrackingUI());
}

function removeTrackingBatch(id){
  const key=String(id||"").toUpperCase();
  state.tracking.openBatchIds=state.tracking.openBatchIds.filter(x=>x!==key);
  delete state.tracking.batchFeeds[key];
  if(state.tracking.selectedBatchId===key) state.tracking.selectedBatchId=state.tracking.openBatchIds[0]||null;
  if(truckMarkers[key]&&leafletMap){leafletMap.removeLayer(truckMarkers[key]);delete truckMarkers[key];}
  if(truckLines[key]&&leafletMap){leafletMap.removeLayer(truckLines[key]);delete truckLines[key];}
  if(customerMarkers[key]&&leafletMap){leafletMap.removeLayer(customerMarkers[key]);delete customerMarkers[key];}
  if(customerLines[key]&&leafletMap){leafletMap.removeLayer(customerLines[key]);delete customerLines[key];}
  delete truckPaths[key];
  render();
}
function openTracking(batchId){
  const id=String(batchId||state.verified?.batchId||state.verifyId||"").toUpperCase();
  if(id && state.user?.role==="customer" && state.verified?.batchId===id){
    state.tracking.records[id]={...state.verified,batchId:id};
  }
  if(id) ensureTrackingBatch(id);
  state.page="tracking"; state.verified=null; render(); window.scrollTo({top:0,behavior:"smooth"});
}
function selectTrackingBatch(id){const key=String(id||"").toUpperCase(); if(!key||!state.tracking.openBatchIds.includes(key))return; state.tracking.selectedBatchId=key; refreshTrackingUI(); if(leafletMap&&truckMarkers[key]){const pos=truckMarkers[key].getLatLng(); leafletMap.panTo(pos,{animate:true,duration:0.5});}}


function startTracking(){
  if(geoWatch===null && navigator.geolocation){
    geoWatch=navigator.geolocation.watchPosition(pos=>{
      state.tracking.beekeeper={lat:Number(pos.coords.latitude.toFixed(6)),lng:Number(pos.coords.longitude.toFixed(6)),accuracy:Math.round(pos.coords.accuracy),live:true,updatedAt:new Date().toISOString(),error:""};
      state.tracking.openBatchIds.forEach(ensureTrackingBatch);
      refreshTrackingUI();
    },err=>{
      state.tracking.beekeeper.live=false; state.tracking.beekeeper.error=err.message; state.tracking.beekeeper.updatedAt=new Date().toISOString(); refreshTrackingUI();
    },{enableHighAccuracy:true,maximumAge:2000,timeout:10000});
  }
  if(trackTimer===null){
    trackTimer=setInterval(()=>{
      const b=state.tracking.beekeeper;
      const centerLat=b.live?b.lat:11.0168, centerLng=b.live?b.lng:76.9558;
      const angle=Date.now()/18000;
      state.tracking.openBatchIds.forEach((id,index)=>{
        ensureTrackingBatch(id);
        const feed=state.tracking.batchFeeds[id]; const off=stableOffset(id); const phase=index*0.9;
        feed.lat=Number((centerLat+0.035+off.x+Math.sin(angle+phase)*0.010).toFixed(6));
        feed.lng=Number((centerLng+0.045+off.y+Math.cos(angle+phase)*0.014).toFixed(6));
        // Customer destination is fixed from the saved/geocoded delivery address.
        feed.speed=Math.round(28+Math.abs(Math.sin((angle+phase)*1.6))*18);
        feed.live=true; feed.updatedAt=new Date().toISOString();
      });
      const s=state.tracking.sensor;
      s.temperature=Number((31.2+Math.sin(angle)*0.7).toFixed(1));
      s.humidity=Number((68+Math.cos(angle)*2.1).toFixed(1));
      s.live=true; s.updatedAt=new Date().toISOString();
      refreshTrackingUI();
      fitTrackingMap();
    },1000);
  }
}
function stopTracking(){
  if(geoWatch!==null && navigator.geolocation){navigator.geolocation.clearWatch(geoWatch);geoWatch=null}
  if(trackTimer!==null){clearInterval(trackTimer);trackTimer=null}
  if(leafletMap){leafletMap.remove();leafletMap=null;beeMarker=null;sensorMarker=null;truckMarkers={};truckLines={};truckPaths={};customerMarkers={};customerLines={}}
  trackingMapFitted=false; truckDemoBound=false;
}
function buildTemperaturePoints(values,w=700,h=220,pad=10){
  const min=29.5,max=33.5;
  return values.map((v,i)=>{
    const x=pad+(i/(values.length-1))*(w-pad*2);
    const y=h-pad-((v-min)/(max-min))*(h-pad*2);
    return [x,y];
  });
}
function temperaturePath(values){
  const pts=buildTemperaturePoints(values);
  if(!pts.length)return "";
  return pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
}
function updateDashboardTemperature(){
  const selected=dashboardSelectedBatchId || Object.keys(state.batches||{})[0] || "HC-001";
  const base=batchTemperatureBase(selected);
  const angle=Date.now()/17000;
  const next=Number((base+Math.sin(angle+(String(selected).length*0.37))*0.85+Math.sin(angle*2.1)*0.16).toFixed(1));
  state.tracking.sensor.temperature=next;
  state.tracking.sensor.humidity=Number((68+Math.cos(angle)*2.2).toFixed(1));
  temperatureHistory.push(next);
  if(temperatureHistory.length>28)temperatureHistory.shift();
  const value=document.getElementById("dash-temperature-value");
  const dot=document.getElementById("dash-temperature-dot");
  const path=document.getElementById("dash-temperature-path");
  const fill=document.getElementById("dash-temperature-fill");
  const latestText=document.getElementById("dash-temperature-latest");
  const minText=document.getElementById("dash-temperature-min");
  const maxText=document.getElementById("dash-temperature-max");
  if(value)value.textContent=next+"°C";
  if(latestText)latestText.textContent=next.toFixed(1)+"°C";
  if(minText)minText.textContent=Math.min(...temperatureHistory).toFixed(1)+"°C";
  if(maxText)maxText.textContent=Math.max(...temperatureHistory).toFixed(1)+"°C";
  if(path)path.setAttribute("d",temperaturePath(temperatureHistory));
  if(fill)fill.setAttribute("d",temperaturePath(temperatureHistory)+" L690 210 L10 210 Z");
  if(dot){const pts=buildTemperaturePoints(temperatureHistory);const last=pts[pts.length-1];dot.setAttribute("cx",last[0]);dot.setAttribute("cy",last[1]);}
}
function startDashboardTemperature(){
  updateDashboardTemperature();
  if(dashboardSensorTimer===null)dashboardSensorTimer=setInterval(updateDashboardTemperature,1500);
}
function stopDashboardTemperature(){
  if(dashboardSensorTimer!==null){clearInterval(dashboardSensorTimer);dashboardSensorTimer=null;}
}

function openAuth(mode,role="beekeeper"){state.auth=true;state.authRole=role;state.mode=mode;state.authMsg="";state.loginEmail="";render()}
function logout(){state.user=null;sessionStorage.removeItem(SKEY);state.page="home";state.verified=null;state.tracking.openBatchIds=[];state.tracking.selectedBatchId=null;state.tracking.batchFeeds={};stopTracking();render()}
function setMode(m){state.mode=m;state.authMsg="";render()}

function submitAuth(form){
 const fd=new FormData(form); const email=(fd.get("email")||"").trim().toLowerCase(); const password=fd.get("password")||"";
 const isCustomer=state.authRole==="customer";
 const accounts=isCustomer?state.customerAccounts:state.accounts;
 const accountKey=isCustomer?CAKEY:AKEY;
 if(state.mode==="signup"){
  const name=(fd.get("name")||"").trim(), confirm=fd.get("confirm")||"";
  if(!name||!email||!password||!confirm){state.authMsg="Complete all fields.";render();return}
  if(!email.includes("@")||!email.includes(".")){state.authMsg="Enter a valid email address.";render();return}
  if(password.length<6){state.authMsg="Password must contain at least 6 characters.";render();return}
  if(password!==confirm){state.authMsg="Passwords do not match.";render();return}
  if(accounts[email]){state.mode="signin";state.authMsg="Account already exists. Sign in instead.";state.loginEmail=email;render();return}
  accounts[email]={name,email,password,role:isCustomer?"customer":"beekeeper"};
  if(isCustomer) state.customerAccounts=accounts; else state.accounts=accounts;
  write(accountKey,accounts);state.mode="signin";state.authMsg="Account created successfully. Now sign in.";state.loginEmail=email;render();return;
 }
 const a=accounts[email];
 if(!a){state.authMsg="No account exists. Create an account first.";render();return}
 if(a.password!==password){state.authMsg="Incorrect email or password.";render();return}
 state.user={name:a.name,email:a.email,role:isCustomer?"customer":"beekeeper"};writeSessionUser(state.user);state.auth=false;state.authMsg="";state.verified=null;
 state.page=isCustomer?"verify":"dashboard";
 if(isCustomer){state.tracking.openBatchIds=[];state.tracking.selectedBatchId=null;state.tracking.batchFeeds={};}
 render();
}

function originStorageKey(){const email=(state.user?.email||"guest").toLowerCase().trim();return "hc_stable_default_origin_"+email.replace(/[^a-z0-9@._-]/g,"");}
function getSavedOrigin(){try{return localStorage.getItem(originStorageKey())||""}catch(e){return ""}}
function saveOrigin(value){try{if(value&&String(value).trim())localStorage.setItem(originStorageKey(),String(value).trim())}catch(e){}}
function syncQualitySummary(){const b=state.batch;const purity=b.qualityPurity||"99.1";const moisture=b.qualityMoisture||"17.2";const colour=b.qualityColour||"Golden Amber";const status=b.qualityStatus||"Passed";b.quality=`Purity: ${purity}% • Moisture: ${moisture}% • Colour: ${colour} • Quality: ${status}`}
function customerLoginUrl(batchId=""){const base=/^https?:\/\/(localhost|127\.0\.0\.1)/.test(window.location.origin)?"https://honeychain-sih26021-vmzz.vercel.app":window.location.origin;const q=batchId?`&batch=${encodeURIComponent(batchId)}`:"";return base+`/?customerLogin=1${q}`}
function qrUrlForBatch(b){const origin=(/^https?:\/\/(localhost|127\.0\.1)(:\d+)?$/i.test(window.location.origin))?"https://honeychain-sih26021-vmzz.vercel.app":window.location.origin;return `${origin}/api/qr?data=${encodeURIComponent(qrPayloadForBatch(b))}`}
function customerPackageMessage(b){return `HoneyChain delivery package\n\nHello ${b.customerName||"Customer"},\nYour honey order is ready.\n\nBatch: ${b.batchId}\nHoney: ${b.honeyType}\nQuantity: ${b.quantity} kg\nPrice: ${formatINR(b.pricePerKg)}/kg\nTotal: ${formatINR(b.totalAmount)}\nManufacture: ${dateText(b.manufactureDate)}\nExpiry: ${dateText(b.expiryDate)}\n\nCustomer Login: ${customerLoginUrl(b.batchId)}\nQR Code Image: ${qrUrlForBatch(b)}\n\nOpen the customer portal to verify the batch, bill and live delivery details.`}
async function sendCustomerDetailsAutomatically(batchId){
 const b=state.batches[String(batchId||"").toUpperCase()]||state.batch;
 if(!b)return {ok:false,message:"Batch not found."};
 const phone=String(b.customerPhone||"").replace(/\D/g,"");
 if(!/^\d{10}$/.test(phone))return {ok:false,message:"Customer phone number must contain exactly 10 digits."};
 if(!b.sendCustomerDetails)return {ok:true,skipped:true,message:"Customer message sending was not selected."};
 try{
   const res=await fetch("/api/send-customer-message",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({channel:b.messageChannel||"sms",phone:b.customerPhone,countryCode:b.countryCode==="custom"?b.customCountryCode||"":b.countryCode||"+91",name:b.customerName||"Customer",message:customerPackageMessage(b),batchId:b.batchId,customerLoginUrl:customerLoginUrl(b.batchId),qrUrl:qrUrlForBatch(b)})});
   const data=await res.json().catch(()=>({}));
   if(!res.ok||!data.ok)throw new Error(data.message||"Messaging service is not configured.");
   return {ok:true,message:data.message||"Customer details sent successfully."};
 }catch(err){
   recordCustomerNotification({...b,notificationStatus:"Not sent",notificationError:String(err.message||err)});
   return {ok:false,message:`Automatic ${String(b.messageChannel||"sms").toUpperCase()} sending is not available yet. Configure the messaging provider in Vercel, then try again.`};
 }
}

function openCustomerWhatsApp(batchId){const b=state.batches[String(batchId||"").toUpperCase()]||state.batch;if(!b)return;const cc=b.countryCode==="custom"?(b.customCountryCode||""):(b.countryCode||"+91");const digits=String(b.customerPhone||"").replace(/\D/g,"");const phone=`${String(cc).replace(/\D/g,"")}${digits}`;const url=`https://wa.me/${phone}?text=${encodeURIComponent(customerPackageMessage(b))}`;window.open(url,"_blank","noopener,noreferrer")}
function openCustomerSms(batchId){const b=state.batches[String(batchId||"").toUpperCase()]||state.batch;if(!b)return;const body=encodeURIComponent(customerPackageMessage(b));const cc=b.countryCode==="custom"?(b.customCountryCode||""):(b.countryCode||"+91");const to=`${cc}${String(b.customerPhone||"").replace(/\D/g,"")}`;window.location.href=`sms:${to}?body=${body}`}
async function copyCustomerPackage(batchId){const b=state.batches[String(batchId||"").toUpperCase()]||state.batch;if(!b)return;try{await navigator.clipboard.writeText(customerPackageMessage(b));state.batchMsg="Customer package message copied. Paste/send it to the customer.";render()}catch(e){state.batchMsg="Copy failed. Use WhatsApp or SMS instead.";render()}}
function recordCustomerNotification(b){try{const key="hc_stable_customer_notifications";const rows=JSON.parse(localStorage.getItem(key)||"[]");rows.unshift({batchId:b.batchId,phone:formatPhone(b.countryCode,b.customerPhone),name:b.customerName,createdAt:new Date().toISOString(),status:"Prepared",customerLoginUrl:customerLoginUrl(b.batchId)});localStorage.setItem(key,JSON.stringify(rows.slice(0,100)))}catch(e){}}
function nextStep(){
 const b=state.batch;
 if(state.step===1 && (!b.batchId.trim()||!b.honeyType.trim()||!b.hiveId.trim()||!b.manufactureDate||!b.expiryDate||!b.quantity||!b.quality.trim())){state.batchMsg="Complete Batch ID, Honey Type, automatic Hive, Manufacture Date, Expiry Date, Quantity and Quality.";render();return}
 if(state.step===1 && b.expiryDate < b.manufactureDate){state.batchMsg="Expiry Date must be on or after the Manufacture Date.";render();return}
 if(state.step===2 && (!b.customerName.trim()||!b.customerPhone.trim()||!b.customerAddress.trim())){state.batchMsg="Complete Customer Name, Phone Number and Delivery Address.";render();return}
 if(state.step===2 && !/^\d{10}$/.test(String(b.customerPhone||""))){state.batchMsg="Customer mobile number must be exactly 10 digits. More or fewer digits are rejected.";render();return}
 if(state.step===2 && !(b.countryCode==="custom"?/^\+\d{1,4}$/.test(String(b.customCountryCode||"")):/^\+\d{1,4}$/.test(String(b.countryCode||"")))){state.batchMsg="Select a valid country calling code.";render();return}
 if(state.step===3 && (!b.harvestDate||!b.location.trim())){state.batchMsg="Complete Harvest Date and Origin / Farm Location.";render();return}
 state.batchMsg=""; state.step++; render();
}
function prevStep(){if(state.step>1){state.step--;state.batchMsg="";render()}}
function registerBatch(){
 syncQualitySummary();
 const rate=priceForHoney(state.batch.honeyType); const qty=Number(state.batch.quantity)||0;
 const b={...state.batch,batchId:state.batch.batchId.trim().toUpperCase(),registeredAt:new Date().toISOString(),hiveId:state.batch.hiveId.trim(),location:state.batch.location.trim(),honeyType:state.batch.honeyType.trim(),quality:state.batch.quality.trim(),customerName:state.batch.customerName.trim(),customerPhone:state.batch.customerPhone.trim(),customerAddress:state.batch.customerAddress.trim(),pricePerKg:rate,totalAmount:qty*rate};
 if(!b.batchId||!b.hiveId||!b.harvestDate||!b.manufactureDate||!b.expiryDate||!b.location||!b.quantity||!b.honeyType||!b.quality||!b.customerName||!b.customerPhone||!b.customerAddress){state.batchMsg="Complete all batch, hive, harvest and customer fields before registration.";render();return}
 if(b.expiryDate < b.manufactureDate){state.batchMsg="Expiry Date must be on or after the Manufacture Date.";render();return}
 if(!/^\d{10}$/.test(String(b.customerPhone||""))){state.batchMsg="Customer mobile number must contain exactly 10 digits.";render();return}
 if(!(b.countryCode==="custom"?/^\+\d{1,4}$/.test(String(b.customCountryCode||"")):/^\+\d{1,4}$/.test(String(b.countryCode||"")))){state.batchMsg="Select a valid country calling code.";render();return}
 if(b.countryCode==="custom"){b.countryCode=String(b.customCountryCode||"").trim()}
 saveOrigin(b.location);
 state.batches[b.batchId]=b; write(BKEY,state.batches); saveSale(b); state.batch=b; state.step=5; state.batchMsg="Batch registered successfully. Sending customer details..."; state.verifyId=b.batchId; state.qrData=""; recordCustomerNotification(b); render();
 if(b.sendCustomerDetails){sendCustomerDetailsAutomatically(b.batchId).then(r=>{state.batchMsg=r.ok?(r.skipped?"Batch registered successfully. Customer message sending was skipped.":"Batch registered and customer details sent successfully."):(r.message||"Batch registered, but customer message was not sent.");render();});}
}

function resetWizard(){state.batch={batchId:"",hiveId:"",harvestDate:"",manufactureDate:"",expiryDate:"",location:getSavedOrigin(),quantity:"",honeyType:"",quality:"",qualityPurity:"99.1",qualityMoisture:"17.2",qualityColour:"Golden Amber",qualityStatus:"Passed",customerName:"",countryCode:"+91",customerPhone:"",customerAddress:"",sendCustomerDetails:true,messageChannel:"sms",pricePerKg:0,totalAmount:0};syncQualitySummary();state.step=1;state.batchMsg="";state.qrData="";render()}
function deleteSelectedBatches(){
 const checks=[...document.querySelectorAll('[data-select-batch]:checked')];
 const ids=[...new Set(checks.map(c=>String(c.dataset.selectBatch||'').toUpperCase()).filter(Boolean))];
 if(!ids.length){ alert('Select at least one batch to delete.'); return; }
 const ok=window.confirm(`Delete ${ids.length} selected batch${ids.length===1?'':'es'}? This cannot be undone.`);
 if(!ok)return;
 ids.forEach(id=>{delete state.batches[id]});
 write(BKEY,state.batches);
 // Keep the daily-sales ledger consistent with deleted batches.
 try{
   const sales=read(SALESKEY,[]);
   write(SALESKEY, sales.filter(x=>!ids.includes(String(x.batchId||'').toUpperCase())));
 }catch(e){}
 if(state.verified && ids.includes(String(state.verified.batchId||'').toUpperCase())) state.verified=null;
 if(ids.includes(String(state.verifyId||'').toUpperCase())) state.verifyId="";
 if(dashboardSelectedBatchId && !state.batches[dashboardSelectedBatchId]) dashboardSelectedBatchId=Object.keys(state.batches||{})[0]||null;
 state.batchMsg=`Deleted ${ids.length} batch${ids.length===1?'':'es'} successfully.`;
 render();
}

function verify(){
  const requested=String(state.verifyId||state.scannedBatch?.batchId||"").trim().toUpperCase();
  let batch=requested?state.batches[requested]:null;
  if(!batch && state.scannedBatch && String(state.scannedBatch.batchId||"").toUpperCase()===requested) batch={...state.scannedBatch};
  // QR payloads are self-contained, so customer devices can verify even when the batch was created on another browser.
  if(!batch && state.scannedBatch && !requested) batch={...state.scannedBatch};
  if(!batch){
    state.verified=null;
    state.batchMsg="Batch ID not found. Scan a registered HoneyChain QR code or enter a valid Batch ID.";
    setScannerMessage("Batch not found.","error");
    render();
    return;
  }
  state.verifyId=requested||String(batch.batchId||"").toUpperCase();
  state.verified={...batch,batchId:String(batch.batchId||requested).trim().toUpperCase()};
  state.scannedBatch=null;
  state.scannedCustomer=null;
  state.batchMsg="";
  if(state.user?.role==="customer") state.tracking.records[state.verified.batchId]={...state.verified};
  render();
  window.scrollTo({top:0,behavior:"smooth"});
}
function scanAnother(){
  try{ stopScanner(false); }catch(e){}
  state.verifyId="";
  state.verified=null;
  state.qrScanLocked=false;
  state.scannedBatch=null;
  state.scannedCustomer=null;
  state.page="verify";
  render();
  window.scrollTo({top:0,behavior:"smooth"});
}

const actions={tracking:()=>{if(state.user?.role==="customer"){const id=state.verified?.batchId||state.tracking.selectedBatchId;if(id){openTracking(id)}else{nav("verify")}}else{nav("tracking")}},
 home:()=>nav("home"),dailySales:()=>{const session=readSessionUser();if(session&&session.role!=="customer"){state.user=session;state.page="dailySales";state.verified=null;render();window.scrollTo({top:0,behavior:"smooth"});}else if(session?.role==="customer"){nav("verify")}else{openAuth("signin","beekeeper")}},dashboard:()=>{const session=readSessionUser();if(session&&typeof session==="object"&&session.role!=="customer"){state.user=session;state.page="dashboard";state.verified=null;render();window.scrollTo({top:0,behavior:"smooth"});}else if(session?.role==="customer"){nav("verify")}else{openAuth("signin","beekeeper")}},batch:()=>{state.user=readSessionUser();if(state.user?.role==="customer"){nav("verify");return}if(!state.batch.batchId){const nums=Object.keys(state.batches||{}).map(k=>{const m=String(k).match(/Batch\s+(\d+)/i);return m?Number(m[1]):0});state.batch.batchId="Batch "+((nums.length?Math.max(...nums):0)+1)}if(!state.batch.location)state.batch.location=getSavedOrigin();syncQualitySummary();nav("batch")},verifyPage:()=>nav("verify"),login:()=>openAuth("signin","beekeeper"),customerLogin:()=>openAuth("signin","customer"),logout,
 signup:()=>openAuth("signup","beekeeper"),signin:()=>openAuth("signin","beekeeper"),closeAuth:()=>{state.auth=false;state.authMsg="";render()},
 tabSignup:()=>setMode("signup"),tabSignin:()=>setMode("signin"),
 next:nextStep,back:prevStep,register:registerBatch,reset:resetWizard,deleteSelectedBatches,verify,openVerify:()=>nav("verify"),startScanner:()=>startScanner(),stopScanner:()=>stopScanner(),openTracking,selectTrackingBatch:(id)=>selectTrackingBatch(id),removeTrackingBatch:(id)=>removeTrackingBatch(id),selectDashboardBatch:(id)=>selectDashboardBatch(id),scanAnother,downloadQr:()=>downloadGeneratedQr((document.querySelector("[data-qr-batch]")||{}).dataset?.qrBatch||state.batch.batchId),downloadBill:()=>downloadBill((document.querySelector("[data-bill-batch]")||{}).dataset?.billBatch||state.batch.batchId),printBill:()=>printBill((document.querySelector("[data-bill-batch]")||{}).dataset?.billBatch||state.batch.batchId),openCustomerWhatsApp:()=>openCustomerWhatsApp((document.querySelector("[data-package-batch]")||{}).dataset?.packageBatch||state.batch.batchId),openCustomerSms:()=>openCustomerSms((document.querySelector("[data-package-batch]")||{}).dataset?.packageBatch||state.batch.batchId),copyCustomerPackage:()=>copyCustomerPackage((document.querySelector("[data-package-batch]")||{}).dataset?.packageBatch||state.batch.batchId),
 openLogin:()=>openAuth("signin","beekeeper")
};

const HONEY_CATALOG=[
 {name:"Clover Honey",code:"CLV",price:900},
 {name:"Orange Blossom Honey",code:"ORB",price:850},
 {name:"Wildflower Honey",code:"WLF",price:700},
 {name:"Eucalyptus Honey",code:"EUC",price:750},
 {name:"Manuka Honey",code:"MNK",price:3500},
 {name:"Buckwheat Honey",code:"BKH",price:1000},
 {name:"Forest and Rock Bee Honey",code:"FRB",price:1200}
];
const HIVE_LIMIT_PER_TYPE=50;
function honeyInfo(type){return HONEY_CATALOG.find(x=>x.name===String(type||""))||null}
function honeyOptions(selected){return HONEY_CATALOG.map(x=>`<option value="${esc(x.name)}" ${selected===x.name?"selected":""}>${esc(x.name)} • ₹${x.price}/kg</option>`).join("")}
function nextHiveId(type){
 const info=honeyInfo(type); if(!info)return "";
 const used=new Set(Object.values(state.batches||{}).filter(b=>b&&b.honeyType===info.name).map(b=>{const m=String(b.hiveId||"").match(/H(\d+)$/i);return m?Number(m[1]):null}).filter(n=>n));
 for(let n=1;n<=HIVE_LIMIT_PER_TYPE;n++){if(!used.has(n))return `${info.code}-H${String(n).padStart(2,"0")}`}
 return "";
}
function priceForHoney(type){const info=honeyInfo(type);return info?info.price:0}
function formatINR(v){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(v)||0)}
function billHtmlForBatch(b){
 const rate=Number(b.pricePerKg)||priceForHoney(b.honeyType); const qty=Number(b.quantity)||0; const total=Number(b.totalAmount)||qty*rate;
 return `<!doctype html><html><head><meta charset="utf-8"><title>HoneyChain Invoice ${esc(b.batchId)}</title><style>body{font-family:Arial,sans-serif;background:#fff8eb;color:#2a2118;padding:36px}.invoice{max-width:760px;margin:auto;background:#fff;border:1px solid #eadfcd;border-radius:18px;padding:36px}.brand{font-size:28px;font-weight:800;color:#195237}.sub{color:#8b735a}.top{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #f0dfbb;padding-bottom:18px;margin-bottom:22px}.pill{display:inline-block;padding:8px 12px;background:#fff0c7;border-radius:999px;color:#8a5a00;font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.box{border:1px solid #eadfcd;border-radius:10px;padding:12px}.box small{display:block;color:#957d62;font-size:10px;margin-bottom:5px}.box b{font-size:14px}.total{margin-top:20px;padding:18px;background:#eef7ef;border-radius:12px;display:flex;justify-content:space-between;font-size:20px;font-weight:800}.foot{margin-top:24px;color:#8b735a;font-size:11px;text-align:center}</style></head><body><div class="invoice"><div class="top"><div><div class="brand">HoneyChain</div><div class="sub">Trusted • Traceable • Smart</div></div><div style="text-align:right"><div class="pill">HONEY BILL</div><div class="sub">Batch ${esc(b.batchId)}</div></div></div><div class="grid"><div class="box"><small>Honey Type</small><b>${esc(b.honeyType)}</b></div><div class="box"><small>Hive ID</small><b>${esc(b.hiveId)}</b></div><div class="box"><small>Manufacture Date</small><b>${dateText(b.manufactureDate)}</b></div><div class="box"><small>Expiry Date</small><b>${dateText(b.expiryDate)}</b></div><div class="box"><small>Harvest Date</small><b>${dateText(b.harvestDate)}</b></div><div class="box"><small>Origin</small><b>${esc(b.location)}</b></div><div class="box"><small>Customer</small><b>${esc(b.customerName)}</b></div><div class="box"><small>Phone</small><b>${esc(formatPhone(b.countryCode,b.customerPhone))}</b></div><div class="box" style="grid-column:1/-1"><small>Delivery Address</small><b>${esc(b.customerAddress)}</b></div><div class="box" style="grid-column:1/-1"><small>Quality</small><b>${esc(b.quality)}</b></div><div class="box"><small>Quantity</small><b>${qty.toFixed(2)} kg</b></div><div class="box"><small>Price / kg</small><b>${formatINR(rate)}</b></div></div><div class="total"><span>Total Amount</span><span>${formatINR(total)}</span></div><div class="foot">Generated by HoneyChain • Prototype bill</div></div></body></html>`;
}
function downloadBill(batchId){
 const b=state.batches[String(batchId||"").toUpperCase()]||state.batch; if(!b)return;
 const html=billHtmlForBatch(b); const blob=new Blob([html],{type:"text/html"}); const href=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=href; a.download=`HoneyChain_${b.batchId}_Bill.html`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(href),1000);
}
function printBill(batchId){
 const b=state.batches[String(batchId||"").toUpperCase()]||state.batch; if(!b)return;
 const w=window.open("","_blank","noopener,noreferrer"); if(!w){state.batchMsg="Allow pop-ups to print the bill.";render();return;}
 w.document.write(billHtmlForBatch(b)); w.document.close(); setTimeout(()=>w.print(),300);
}
function qrPayloadForBatch(b){return "HONEYCHAIN|"+JSON.stringify({
 batchId:b.batchId||"",hiveId:b.hiveId||"",harvestDate:b.harvestDate||"",manufactureDate:b.manufactureDate||"",expiryDate:b.expiryDate||"",location:b.location||"",quantity:b.quantity||"",honeyType:b.honeyType||"",quality:b.quality||"",qualityPurity:b.qualityPurity||"",qualityMoisture:b.qualityMoisture||"",qualityColour:b.qualityColour||"",qualityStatus:b.qualityStatus||"",
 customerName:b.customerName||"",countryCode:b.countryCode||"+91",customerPhone:b.customerPhone||"",customerAddress:b.customerAddress||"",pricePerKg:Number(b.pricePerKg)||priceForHoney(b.honeyType),totalAmount:Number(b.totalAmount)||((Number(b.quantity)||0)*priceForHoney(b.honeyType))
});}

function wizard(){
 const b=state.batch; const currentType=honeyInfo(b.honeyType); const rate=priceForHoney(b.honeyType); const estTotal=(Number(b.quantity)||0)*rate;
 const header=["Batch & Hive","Customer Details","Harvest & Origin","Blockchain Registration","QR Generation","Bill Generation"].map((x,i)=>`<button class="wizard-btn ${state.step===i+1?"current":""} ${state.step>i+1?"done":""}" data-action="step${i+1}"><b>${i+1}</b><span>${x}</span></button>`).join("");
 let body="";
 if(state.step===1) body=`<div class="wizardscreen"><div class="step-kicker">STEP 01</div><h3>Batch, Hive & Quality</h3><p>Select the honey type and HoneyChain will assign the next available hive automatically.</p><div class="formgrid"><label>Batch Number (Automatic)<input data-field="batchId" value="${esc(b.batchId)}" readonly></label><label>Honey Type<select data-field="honeyType"><option value="">Select honey type</option>${honeyOptions(b.honeyType)}</select></label><label>Automatically Assigned Hive<div class="auto-field"><strong>${esc(b.hiveId)||"Select a honey type first"}</strong><small>${currentType?`Hive ${esc(b.hiveId.split("-H").pop())} of ${HIVE_LIMIT_PER_TYPE} available for ${esc(currentType.name)}`:"50 hives available for every honey type"}</small></div></label><label>Manufacture Date<input data-field="manufactureDate" type="date" value="${esc(b.manufactureDate)}"></label><label>Expiry Date<input data-field="expiryDate" type="date" value="${esc(b.expiryDate)}"></label><label>Quantity (kg)<input data-field="quantity" type="number" min="0.1" step="0.1" value="${esc(b.quantity)}" placeholder="18"></label></div><div class="quality-label"><div style="display:flex;justify-content:space-between;align-items:center"><span>Quality Details</span><span class="quality-fields-note">Enter the four values — HoneyChain builds the quality record automatically.</span></div><div class="quality-grid"><label>Purity (%)<input data-field="qualityPurity" type="number" min="0" max="100" step="0.1" value="${esc(b.qualityPurity||"99.1")}"></label><label>Moisture (%)<input data-field="qualityMoisture" type="number" min="0" max="100" step="0.1" value="${esc(b.qualityMoisture||"17.2")}"></label><label>Colour<input data-field="qualityColour" value="${esc(b.qualityColour||"Golden Amber")}" placeholder="Golden Amber"></label><label>Status<select data-field="qualityStatus"><option ${b.qualityStatus==="Passed"?"selected":""}>Passed</option><option ${b.qualityStatus==="Review"?"selected":""}>Review</option><option ${b.qualityStatus==="Rejected"?"selected":""}>Rejected</option></select></label></div><div id="quality-summary" class="quality-summary">${esc(b.quality||"Purity: 99.1% • Moisture: 17.2% • Colour: Golden Amber • Quality: Passed")}</div></div><div class="pricing-strip"><div><small>DEMO PRICE / KG</small><strong>${b.honeyType?formatINR(rate):"Select honey type"}</strong></div><div><small>ESTIMATED BATCH VALUE</small><strong>${b.honeyType&&b.quantity?formatINR(estTotal):"—"}</strong></div><div><small>HIVE INVENTORY</small><strong>${HIVE_LIMIT_PER_TYPE} hives / type</strong></div></div></div>`;
 if(state.step===2) body=`<div class="wizardscreen"><div class="step-kicker">STEP 02</div><h3>Customer Details</h3><p>Enter the delivery recipient and destination for this batch.</p><div class="formgrid"><label>Customer Name<input data-field="customerName" value="${esc(b.customerName)}" placeholder="Rahul Kumar"></label><label>Phone Number<div class="phone-field"><select data-field="countryCode" aria-label="Country code">${countryOptions(b.countryCode||"+91")}</select><input data-field="customerPhone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="10" minlength="10" pattern="[0-9]{10}" value="${esc(b.customerPhone)}" placeholder="9876543210"></div><small class="phone-validation ${/^\d{10}$/.test(String(b.customerPhone||""))?"ok":"bad"}">${/^\d{10}$/.test(String(b.customerPhone||""))?"✓ 10-digit mobile number accepted":"Enter exactly 10 digits — the batch cannot continue until valid."}</small>${b.countryCode==="custom"?`<input data-field="customCountryCode" inputmode="tel" maxlength="5" placeholder="+123" value="${esc(b.customCountryCode||"")}" style="margin-top:6px">`:""}</label><label style="grid-column:1/-1">Delivery Address<textarea class="customer-address-field" data-field="customerAddress" placeholder="12 MG Road, Hyderabad, Telangana">${esc(b.customerAddress)}</textarea></label><label class="send-customer-option" style="grid-column:1/-1"><span><input type="checkbox" data-field="sendCustomerDetails" ${b.sendCustomerDetails!==false?"checked":""}> <b>Send details to customer after registration</b><small>Automatically send the order message, customer login link and QR link after the batch is registered.</small></span></label><label>Message Channel<select data-field="messageChannel"><option value="sms" ${b.messageChannel==="sms"?"selected":""}>SMS (Twilio)</option><option value="whatsapp" ${b.messageChannel==="whatsapp"?"selected":""}>WhatsApp (Twilio)</option></select></label></div></div>`;
 if(state.step===3) body=`<div class="wizardscreen"><div class="step-kicker">STEP 03</div><h3>Harvest & Origin</h3><p>Complete the farm and harvest information used for traceability and delivery mapping.</p><div class="formgrid"><label>Harvest Date<input data-field="harvestDate" type="date" value="${esc(b.harvestDate)}"></label><div class="origin-row"><label>Origin / Farm Location<input data-field="location" value="${esc(b.location||getSavedOrigin())}" placeholder="XYZ Farm, Coimbatore, Tamil Nadu"></label></div></div><div class="origin-note">This address is remembered for your next batches. You can change it anytime by editing the field.</div><div class="note">The customer destination comes from Step 02 and will be used by Live Tracking.</div></div>`;
 if(state.step===4) body=`<div class="wizardscreen"><div class="step-kicker">STEP 04</div><h3>Blockchain Registration</h3><p>Review the complete record before registration.</p><div class="review"><div class="review-box"><small>Batch ID</small><strong>${esc(b.batchId)||"—"}</strong></div><div class="review-box"><small>Honey Type</small><strong>${esc(b.honeyType)||"—"}</strong></div><div class="review-box"><small>Hive ID</small><strong>${esc(b.hiveId)||"—"}</strong></div><div class="review-box"><small>Quality</small><strong>${esc(b.quality)||"—"}</strong></div><div class="review-box"><small>Manufacture Date</small><strong>${dateText(b.manufactureDate)}</strong></div><div class="review-box"><small>Expiry Date</small><strong>${dateText(b.expiryDate)}</strong></div><div class="review-box"><small>Harvest Date</small><strong>${dateText(b.harvestDate)}</strong></div><div class="review-box"><small>Origin</small><strong>${esc(b.location)||"—"}</strong></div><div class="review-box"><small>Customer</small><strong>${esc(b.customerName)||"—"}</strong></div><div class="review-box"><small>Phone</small><strong>${esc(b.customerPhone)||"—"}</strong></div><div class="review-box"><small>Delivery Address</small><strong>${esc(b.customerAddress)||"—"}</strong></div><div class="review-box"><small>Price / kg</small><strong>${formatINR(rate)}</strong></div><div class="review-box"><small>Estimated Total</small><strong>${formatINR(estTotal)}</strong></div><div class="review-box hashbox"><small>Record hash</small><code>0x${(b.batchId+b.hiveId+b.harvestDate+b.customerPhone).replace(/\W/g,"").slice(0,12).toLowerCase().padEnd(12,"a")}...a91c</code></div></div><div class="note">Ready for registration. The prototype stores this record locally in your browser.</div></div>`;
 if(state.step===5) body=`<div class="wizardscreen"><div class="step-kicker">STEP 05</div><h3>QR Generation Complete</h3><p>Your package QR contains the batch identity, dates, customer details and pricing.</p><div class="qrfinish"><div><img id="generated-qr-image" alt="HoneyChain QR for ${esc(b.batchId)}" src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(qrPayloadForBatch(b))}"><button class="qr-download" data-action="downloadQr" data-qr-batch="${esc(b.batchId)}">⬇ Download QR Code</button></div><div class="qrinfo"><small>REGISTERED BATCH</small><strong>${esc(b.batchId)}</strong><span>${esc(b.honeyType)} • ${esc(b.hiveId)}</span><span>Customer: ${esc(b.customerName)}</span><span>Price: ${formatINR(b.pricePerKg||rate)}/kg</span><span>Total: ${formatINR(b.totalAmount||estTotal)}</span><span style="max-width:260px">${esc(b.customerAddress)}</span><button class="btn secondary" data-action="openVerify">Go to Consumer Verification</button></div></div><div class="note">The QR includes the data needed to restore the batch for customer verification.</div></div>`;
 if(state.step===6) body=`<div class="wizardscreen"><div class="step-kicker">STEP 06</div><h3>Bill Generated</h3><p>Your HoneyChain bill is ready with the batch, customer, delivery and pricing details.</p><div class="bill-preview"><div class="bill-head"><div><strong>HoneyChain</strong><small>Trusted • Traceable • Smart</small></div><span>HONEY BILL</span></div><div class="bill-grid"><div><small>Batch ID</small><b>${esc(b.batchId)}</b></div><div><small>Honey Type</small><b>${esc(b.honeyType)}</b></div><div><small>Hive ID</small><b>${esc(b.hiveId)}</b></div><div><small>Quantity</small><b>${esc(b.quantity)} kg</b></div><div><small>Manufacture</small><b>${dateText(b.manufactureDate)}</b></div><div><small>Expiry</small><b>${dateText(b.expiryDate)}</b></div><div><small>Customer</small><b>${esc(b.customerName)}</b></div><div><small>Phone</small><b>${esc(formatPhone(b.countryCode,b.customerPhone))}</b></div><div class="bill-full"><small>Delivery Address</small><b>${esc(b.customerAddress)}</b></div><div class="bill-full"><small>Quality</small><b>${esc(b.quality)}</b></div></div><div class="bill-total"><span>Total</span><strong>${formatINR(b.totalAmount||estTotal)}</strong></div></div><div class="bill-actions"><button class="btn primary" data-action="downloadBill" data-bill-batch="${esc(b.batchId)}">⬇ Download Bill</button><button class="btn secondary" data-action="printBill" data-bill-batch="${esc(b.batchId)}">🖨 Print Bill</button></div><div class="customer-package" data-package-batch="${esc(b.batchId)}"><div class="customer-package-head"><div><strong>Customer Delivery Package</strong><small>Prepared automatically from the customer phone number.</small></div><span class="pill" style="background:#eef7ef;color:#2d7d4c">PACKAGE READY</span></div><div class="package-link">Customer login link: ${esc(customerLoginUrl())}</div><div class="package-actions"><button class="btn primary" data-action="openCustomerWhatsApp" data-package-batch="${esc(b.batchId)}">💬 WhatsApp fallback</button><button class="btn secondary" data-action="openCustomerSms" data-package-batch="${esc(b.batchId)}">📱 SMS fallback</button><button class="btn secondary" data-action="copyCustomerPackage" data-package-batch="${esc(b.batchId)}">📋 Copy Message</button></div><div class="package-warning">HoneyChain automatically sends the selected channel immediately after registration when Twilio is configured. The buttons above are only fallbacks if automatic delivery fails.</div></div></div>`;
 const controls=(state.step>1?`<button class="btn secondary" data-action="back">← Back</button>`:"")+(state.step<4?`<button class="btn primary" data-action="next">Continue →</button>`:"")+(state.step===4?`<button class="btn primary" data-action="register">Register Batch & Continue →</button>`:"")+(state.step===5?`<button class="btn primary" data-action="next">Continue to Bill →</button>`:"")+(state.step===6?`<button class="btn primary" data-action="reset">Create Another Batch</button>`:"");
 return `<div class="panel wizard-panel"><div class="wizard">${header}</div>${body}<div class="formbottom">${controls}${state.batchMsg?`<span class="message">${esc(state.batchMsg)}</span>`:""}</div></div>`;
}
function authModal(){
 const email=state.loginEmail||"";
 const customer=state.authRole==="customer";
 const title=customer?"CUSTOMER ACCESS":"BEEKEEPER ACCESS";
 const heading=state.mode==="signup"?(customer?"Create your customer account":"Create your beekeeper account"):"Sign in to HoneyChain";
 const desc=state.mode==="signup"?"Create an account first, then sign in.":(customer?"Scan HoneyChain QR codes to view verified product and delivery information.":"Use an account you already created.");
 return `<div class="overlay"><div class="modal"><button class="close" data-action="closeAuth">×</button><div class="modal-icon">${customer?"👤":"🍯"}</div><div class="eyebrow">${title}</div><h2>${heading}</h2><p>${desc}</p><div class="auth-tabs"><button data-action="tabSignup" class="${state.mode==="signup"?"selected":""}">Create Account</button><button data-action="tabSignin" class="${state.mode==="signin"?"selected":""}">Sign In</button></div><form id="auth-form">${state.mode==="signup"?`<label>Full Name<input name="name" placeholder="Your name" required></label>`:""}<label>Email<input name="email" type="email" value="${esc(email)}" placeholder="you@example.com" required></label><label>Password<input name="password" type="password" placeholder="Minimum 6 characters" required></label>${state.mode==="signup"?`<label>Confirm Password<input name="confirm" type="password" placeholder="Re-enter password" required></label>`:""}${state.authMsg?`<div class="authmsg">${esc(state.authMsg)}</div>`:""}<button class="btn primary" style="width:100%;margin-top:12px" type="submit">${state.mode==="signup"?"Create Account":"Sign In"} →</button></form><div class="switch">${state.mode==="signup"?"Already have an account?":"New to HoneyChain?"} <button type="button" data-action="${state.mode==="signup"?"tabSignin":"tabSignup"}">${state.mode==="signup"?"Sign In":"Create Account"}</button></div></div></div>`;
}

function decodeHoneyChainPayload(decodedText){
 let raw=String(decodedText||"").trim(); if(!raw)return "";
 const pipe=raw.match(/^HONEYCHAIN\|(.+)$/i); if(pipe)raw=pipe[1];
 try{
   const obj=JSON.parse(raw);
   if(obj&&obj.batchId){
     state.scannedCustomer={name:obj.customerName||"",phone:obj.customerPhone||"",address:obj.customerAddress||""};
     state.scannedBatch={batchId:String(obj.batchId).trim().toUpperCase(),hiveId:obj.hiveId||"",harvestDate:obj.harvestDate||"",manufactureDate:obj.manufactureDate||"",expiryDate:obj.expiryDate||"",location:obj.location||"",quantity:obj.quantity||"",honeyType:obj.honeyType||"",quality:obj.quality||"",qualityPurity:obj.qualityPurity||"",qualityMoisture:obj.qualityMoisture||"",qualityColour:obj.qualityColour||"",qualityStatus:obj.qualityStatus||"",customerName:obj.customerName||"",countryCode:obj.countryCode||"+91",customerPhone:obj.customerPhone||"",customerAddress:obj.customerAddress||"",pricePerKg:Number(obj.pricePerKg)||priceForHoney(obj.honeyType),totalAmount:Number(obj.totalAmount)||((Number(obj.quantity)||0)*priceForHoney(obj.honeyType))};
     return String(obj.batchId).trim().toUpperCase();
   }
 }catch(e){}
 try{const u=new URL(raw,window.location.href);const q=u.searchParams.get("batchId")||u.searchParams.get("batch")||u.searchParams.get("id");if(q)return q.trim().toUpperCase()}catch(e){}
 const m=raw.match(/(?:batchId|batch|id)\s*[:=]\s*([^&|\s]+)/i); if(m)return m[1].trim().toUpperCase();
 return raw.toUpperCase();
}
function setScannerMessage(text,type){
  const st=document.getElementById("scanner-status"),er=document.getElementById("scanner-error");
  if(st){st.style.display=type==="error"?"none":"block";st.textContent=type==="error"?"":text}
  if(er){er.style.display=type==="error"?"block":"none";er.textContent=type==="error"?text:""}
}
async function handleDecodedQr(decodedText){
  if(!decodedText||state.qrScanLocked)return;
  state.qrScanLocked=true;
  const id=decodeHoneyChainPayload(decodedText);
  if(!id){state.qrScanLocked=false;return}
  setScannerMessage("QR detected — verifying "+id+"…");
  state.verifyId=id;
  await stopScanner(false);
  verify();
}
async function startScanner(){
  if(state.qrScanner) return;
  state.qrScanLocked=false;
  const st=document.getElementById("scanner-status"),er=document.getElementById("scanner-error"),reader=document.getElementById("qr-reader");
  if(st){st.textContent="Starting camera…";st.style.display="block"}
  if(er){er.textContent="";er.style.display="none"}
  if(!reader){setScannerMessage("Scanner area is unavailable. Refresh the page and try again.","error");return}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){setScannerMessage("Camera access is unavailable in this browser. Open HoneyChain over HTTPS or localhost and allow camera permission.","error");return}
  try{
    reader.innerHTML="";
    const wrap=document.createElement("div");
    wrap.id="qr-camera-wrap";
    Object.assign(wrap.style,{position:"relative",width:"100%",minHeight:"240px",background:"#111",borderRadius:"12px",overflow:"hidden"});
    const video=document.createElement("video");
    video.className="native-scan-video"; video.setAttribute("playsinline",""); video.muted=true; video.autoplay=true;
    const canvas=document.createElement("canvas"); canvas.style.display="none";
    wrap.appendChild(video);wrap.appendChild(canvas);reader.appendChild(wrap);
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}},audio:false});
    video.srcObject=stream;
    await video.play();
    state.qrScanner={active:true,stream,video,canvas,raf:0,detector:null,instance:null,isScanning:true,lastTry:0};
    if(typeof BarcodeDetector!=="undefined"){
      try{state.qrScanner.detector=new BarcodeDetector({formats:["qr_code"]})}catch(e){try{state.qrScanner.detector=new BarcodeDetector()}catch(e2){state.qrScanner.detector=null}}
    }
    setScannerMessage("Scanning live QR codes — hold the entire QR inside the frame…");
    const ctx=canvas.getContext("2d",{willReadFrequently:true});
    const scan=async()=>{
      const sc=state.qrScanner;
      if(!sc||!sc.active)return;
      try{
        if(video.readyState>=2&&video.videoWidth>0){
          canvas.width=video.videoWidth;canvas.height=video.videoHeight;
          ctx.drawImage(video,0,0,canvas.width,canvas.height);
          let decoded="";
          if(sc.detector){
            try{const codes=await sc.detector.detect(canvas);if(codes&&codes.length&&codes[0].rawValue)decoded=codes[0].rawValue}catch(e){}
          }
          if(!decoded&&typeof jsQR==="function"){
            try{
              const image=ctx.getImageData(0,0,canvas.width,canvas.height);
              const code=jsQR(image.data,image.width,image.height,{inversionAttempts:"attemptBoth"});
              if(code&&code.data)decoded=code.data;
            }catch(e){}
          }
          if(decoded){await handleDecodedQr(decoded);return;}
        }
      }catch(e){}
      sc.raf=requestAnimationFrame(scan);
    };
    state.qrScanner.raf=requestAnimationFrame(scan);
  }catch(err){
    try{if(state.qrScanner&&state.qrScanner.stream)state.qrScanner.stream.getTracks().forEach(t=>t.stop())}catch(e){}
    state.qrScanner=null;
    const name=err&&err.name?" ("+err.name+")":""; const msg=err&&err.message?" — "+err.message:"";
    setScannerMessage("Camera could not start. Allow camera permission and try again."+name+msg,"error");
  }
}
async function stopScanner(showMessage=true){
  const scanner=state.qrScanner;if(!scanner)return;
  try{scanner.active=false;if(scanner.instance){try{if(scanner.isScanning)await scanner.instance.stop()}catch(e){}try{await scanner.instance.clear()}catch(e){}}if(scanner.stream)scanner.stream.getTracks().forEach(t=>t.stop());if(scanner.raf)cancelAnimationFrame(scanner.raf);if(scanner.video)scanner.video.srcObject=null}catch(e){}
  state.qrScanner=null;state.qrScanLocked=false;
  const reader=document.getElementById("qr-reader");if(reader)reader.innerHTML="";
  if(showMessage)setScannerMessage("Ready to scan…");
}
async function scanQrImage(file){
  const st=document.getElementById("scanner-status"),er=document.getElementById("scanner-error");
  if(!file)return;
  try{await stopScanner(false)}catch(e){}
  if(st){st.textContent="Scanning uploaded QR image…";st.style.display="block"}
  if(er){er.textContent="";er.style.display="none"}
  const img=new Image(); const url=URL.createObjectURL(file);
  try{
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});
    const canvas=document.createElement("canvas");
    const maxW=1800,scale=Math.min(1,maxW/img.naturalWidth);canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=canvas.getContext("2d",{willReadFrequently:true});ctx.drawImage(img,0,0,canvas.width,canvas.height);
    let decoded="";
    if(typeof jsQR==="function"){
      try{const image=ctx.getImageData(0,0,canvas.width,canvas.height);const code=jsQR(image.data,image.width,image.height,{inversionAttempts:"attemptBoth"});if(code&&code.data)decoded=code.data}catch(e){}
    }
    if(!decoded&&typeof Html5Qrcode!=="undefined"){
      const tempId="qr-image-decoder";let temp=document.getElementById(tempId);if(!temp){temp=document.createElement("div");temp.id=tempId;temp.style.display="none";document.body.appendChild(temp)}
      const scanner=new Html5Qrcode(tempId);try{decoded=await scanner.scanFile(file,true)}catch(e){}finally{try{await scanner.clear()}catch(e){}}
    }
    if(!decoded)throw new Error("No QR code detected");
    const id=decodeHoneyChainPayload(decoded);if(!id)throw new Error("QR payload is empty");
    state.qrScanLocked=true;state.verifyId=id;
    setScannerMessage(`QR detected: ${id}. Verifying…`);
    verify();
  }catch(err){
    if(er){er.textContent="Could not detect the HoneyChain QR in that image. Upload the complete, clear QR code image.";er.style.display="block"}
    if(st){st.textContent="Ready to scan…";st.style.display="block"}
  }finally{URL.revokeObjectURL(url)}
}
async function downloadGeneratedQr(batchId){
 const b=state.batches[String(batchId||"").toUpperCase()]||state.batch;
 const payload=qrPayloadForBatch(b);
 const url=`https://api.qrserver.com/v1/create-qr-code/?size=900x900&margin=20&data=${encodeURIComponent(payload)}`;
 try{const res=await fetch(url,{mode:"cors"});if(!res.ok)throw new Error("download failed");const blob=await res.blob();const href=URL.createObjectURL(blob);const a=document.createElement("a");a.href=href;a.download=`HoneyChain_${b.batchId}_QR.png`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),1000)}catch(e){window.open(url,"_blank","noopener,noreferrer")}
}
function consumerStory(b){
  const s=state.tracking.sensor||{temperature:31.2,humidity:68}, tr=state.tracking.truck||{speed:36};
  const stages=[
    ["🐝","Hive Handoff",`Hive ${b.hiveId} registered at ${b.location}`],
    ["🌼","Harvested",`${dateText(b.harvestDate)} • ${b.quantity} kg ${b.honeyType}`],
    ["🏭","Processing","Quality inspection completed and batch record secured"],
    ["📦","Packaging",`Batch ${b.batchId} linked to the consumer QR code`],
    ["🚚","Distribution",`Truck feed active • ${tr.speed} km/h simulated live GPS • Destination: ${b.customerName||"Customer"}`],
    ["✅","Consumer Verified","QR identity matches the registered batch record"]
  ];
  const stageHtml=stages.map(([ico,title,desc],i)=>`<div class="journey-item"><div class="journey-icon">${ico}</div><div><b>${i+1}. ${title}</b><span>${esc(desc)}</span></div><div class="journey-status">VERIFIED</div></div>`).join("");
  const pseudoHash=`0x${(b.batchId||"HC").replace(/[^A-Za-z0-9]/g,"").padEnd(12,"7")}9c41a8b2e5`;
  return `<div class="consumer-hero"><div><div class="eyebrow">HONEYCHAIN CONSUMER RECORD</div><h3>${esc(b.honeyType)} • ${esc(b.batchId)}</h3><p>Farm-to-consumer journey secured in one traceable record.</p></div><span class="verified-pill">✓ VERIFIED &amp; TRACEABLE</span></div>
  <div class="consumer-grid">${[["Batch ID",b.batchId],["Origin",b.location],["Hive ID",b.hiveId],["Harvest Date",dateText(b.harvestDate)],["Manufacture Date",dateText(b.manufactureDate)],["Expiry Date",dateText(b.expiryDate)],["Quantity",`${b.quantity} kg`],["Price / kg",formatINR(b.pricePerKg||priceForHoney(b.honeyType))],["Total Amount",formatINR(b.totalAmount||((Number(b.quantity)||0)*priceForHoney(b.honeyType)))],["Quality",b.quality],["Customer",b.customerName||"—"],["Customer Phone",formatPhone(b.countryCode,b.customerPhone)||"—"],["Delivery Address",b.customerAddress||"—"]].map(([l,v])=>`<div class="consumer-card"><small>${l}</small><b>${esc(v)}</b></div>`).join("")}</div>
  <div class="journey"><div class="journey-head"><h4>Full traceability timeline</h4><p>Every stage is linked to the batch identity.</p></div><div class="journey-list">${stageHtml}</div></div>
  <div class="condition-strip"><div class="condition-box"><small>LIVE TEMPERATURE</small><strong>${Number(s.temperature).toFixed(1)}°C</strong><em>Sensor stream</em></div><div class="condition-box"><small>LIVE HUMIDITY</small><strong>${Number(s.humidity).toFixed(1)}%</strong><em>Sensor stream</em></div><div class="condition-box"><small>DELIVERY GPS</small><strong>${Number(tr.speed||0)} km/h</strong><em>Truck feed active</em></div></div>
  <div class="consumer-actions"><button class="btn primary" data-action="openTracking" data-track-batch="${esc(b.batchId)}">🚚 View Live Delivery</button><button class="btn secondary" data-action="scanAnother">Scan Another QR</button></div>
  <div class="blockchain-strip"><span>Blockchain record matched</span><code>${pseudoHash}</code></div>`;
}

function trackingPage(){
  startTracking();
  const b=state.tracking.beekeeper,s=state.tracking.sensor;
  if(!state.tracking.openBatchIds.length){
    const sourceIds=state.user?.role==="customer" ? Object.keys(state.tracking.records||{}) : Object.keys(state.batches||{});
    if(sourceIds.length) ensureTrackingBatch(sourceIds[0]);
  }
  const selected=state.tracking.selectedBatchId; const tr=selected?state.tracking.batchFeeds[selected]:null;
  return `<main class="page tracking-page">
    <div class="title"><div><div class="eyebrow">LIVE TELEMETRY</div><h2>Farm & Delivery Tracking</h2><p>Track multiple honey deliveries at the same time and switch between batches.</p></div><span class="live-badge">● LIVE</span></div>
    <div class="panel multi-track-panel"><div><div class="eyebrow">ACTIVE DELIVERIES</div><h3>Tracked batches</h3></div><div id="tracking-batch-list" class="tracking-tabs">${state.tracking.openBatchIds.map(id=>{const f=state.tracking.batchFeeds[id]||{};const active=id===selected;return `<button class="tracking-tab ${active?"active":""}" data-action="selectTrackingBatch" data-track-batch="${esc(id)}"><span>🚚</span><span><b>${esc(id)}</b><small>${f.speed||0} km/h • ${active?"Viewing":"Open"}</small></span><i data-action="removeTrackingBatch" data-track-batch="${esc(id)}">×</i></button>`}).join("")||`<span class="muted">Open a delivery from Consumer Verification to start tracking a batch.</span>`}</div></div>
    <div class="tracking-grid">
      <div class="panel map-panel">
        <div class="map-head"><div><div class="eyebrow">LIVE MAP</div><h3>Real-time movement • Multiple deliveries</h3></div><span class="map-note">OpenStreetMap • Live tracking</span></div>
        <div class="map-stage"><div id="live-map" class="real-map"></div><div id="map-fallback" class="map-fallback">Loading interactive map…</div></div>
        <div class="map-legend"><span><i class="dot bee-dot"></i>Beekeeper GPS</span><span><i class="dot truck-dot"></i>Delivery trucks</span><span><i class="dot sensor-dot"></i>Hive IoT</span><span><i class="dot customer-dot"></i>Customer</span></div>
      </div>
      <div class="tracking-side">
        <div class="panel live-card"><div class="eyebrow">SELECTED DELIVERY</div><h3 id="selected-batch-title">${esc(selected||"No batch selected")}</h3><div class="live-row"><span>Batch</span><strong>${esc(selected||"—")}</strong></div><div class="live-row"><span>Truck GPS</span><strong id="truck-coords">${tr?`${tr.lat.toFixed(5)}, ${tr.lng.toFixed(5)}`:"—"}</strong></div><div class="live-row"><span>Speed</span><strong id="truck-speed">${tr?tr.speed+" km/h":"—"}</strong></div><div class="live-row"><span>Status</span><strong class="ok">${tr?"SIMULATED LIVE":"WAITING"}</strong></div><div class="live-row"><span>Updated</span><strong id="truck-updated">${tr?new Date(tr.updatedAt).toLocaleTimeString():"—"}</strong></div>${selected&&getTrackingBatch(selected)?`<div class="live-row"><span>Customer</span><strong id="tracking-customer-name">${esc((getTrackingBatch(selected)||{}).customerName||"—")}</strong></div><div class="live-row"><span>Phone</span><strong id="tracking-customer-phone">${esc((getTrackingBatch(selected)||{}).customerPhone||"—")}</strong></div><div class="live-row"><span>Destination</span><strong id="tracking-destination">${esc((getTrackingBatch(selected)||{}).customerAddress||"—")}</strong></div>`:""}</div>
        <div class="panel live-card"><div class="eyebrow">BEEKEEPER GPS</div><h3 id="beekeeper-coords">${b.live?`${b.lat}, ${b.lng}`:"Waiting for location"}</h3><div class="live-row"><span>Status</span><strong id="beekeeper-status" class="${b.live?"ok":""}">${b.live?"LIVE":"WAITING"}</strong></div><div class="live-row"><span>Accuracy</span><strong id="beekeeper-accuracy">${b.accuracy?b.accuracy+" m":"—"}</strong></div><div class="live-row"><span>Updated</span><strong id="beekeeper-updated">${b.updatedAt?new Date(b.updatedAt).toLocaleTimeString():"—"}</strong></div><small class="warn" id="beekeeper-error" style="display:${b.error?"block":"none"}">${b.error?esc(b.error)+". Allow browser location permission.":""}</small></div>
        <div class="panel sensor-card"><div class="eyebrow">IoT SENSOR FEED</div><div class="sensor"><span>Temperature</span><strong id="sensor-temperature">${s.temperature}°C</strong></div><div class="sensor"><span>Humidity</span><strong id="sensor-humidity">${s.humidity}%</strong></div><div class="sensor-status"><i class="dot sensor-dot"></i><span id="sensor-status">${s.live?"LIVE SENSOR STREAM":"OFFLINE"}</span></div><small class="muted">All open deliveries share the current demo hive telemetry stream; real hardware can publish per-load telemetry later.</small></div>
      </div>
    </div>
  </main>`;
}

function markerIcon(emoji,label){
  return L.divIcon({className:"",html:`<div class="map-marker-icon"><span>${emoji}</span>${label}</div>`,iconSize:[100,42],iconAnchor:[50,42],popupAnchor:[0,-40]});
}
function fitTrackingMap(){
  if(!leafletMap||!beeMarker)return;
  const points=[beeMarker.getLatLng(),...Object.values(truckMarkers).map(m=>m.getLatLng()),...Object.values(customerMarkers).map(m=>m.getLatLng())];
  if(points.length<2)return;
  const bounds=L.latLngBounds(points.map(p=>[p.lat,p.lng]));
  if(!trackingMapFitted){leafletMap.fitBounds(bounds.pad(0.18),{padding:[40,40],maxZoom:14,animate:false});trackingMapFitted=true;}
}
function showMapError(message){
  const fallback=document.getElementById("map-fallback");
  if(fallback){fallback.style.display="flex";fallback.textContent=message;}
}
function ensureLeafletLoaded(){
  return new Promise((resolve)=>{
    if(typeof L!=="undefined"){resolve(true);return;}
    let css=document.getElementById("leaflet-css-dynamic");
    if(!css){css=document.createElement("link");css.id="leaflet-css-dynamic";css.rel="stylesheet";css.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";document.head.appendChild(css);}
    const sources=[
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
      "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"
    ];
    let index=0, settled=false;
    const finish=(ok)=>{if(!settled){settled=true;resolve(ok);}};
    const tryNext=()=>{
      if(typeof L!=="undefined"){finish(true);return;}
      if(index>=sources.length){finish(false);return;}
      const script=document.createElement("script");
      script.src=sources[index++];
      script.async=true;
      script.onload=()=>finish(typeof L!=="undefined");
      script.onerror=()=>tryNext();
      document.head.appendChild(script);
    };
    tryNext();
  });
}
async function initRealMap(){
  const el=document.getElementById("live-map"), fallback=document.getElementById("map-fallback");
  if(!el||leafletMap)return;
  if(!(await ensureLeafletLoaded())){showMapError("Interactive map could not load. Check your internet connection and refresh.");return;}
  if(typeof L==="undefined"){showMapError("Interactive map is unavailable. Please refresh and try again.");return;}
  const b=state.tracking.beekeeper; const lat=b.lat ?? 11.0168,lng=b.lng ?? 76.9558;
  leafletMap=L.map(el,{zoomControl:true,scrollWheelZoom:true}).setView([lat,lng],14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap contributors"}).addTo(leafletMap);
  beeMarker=L.marker([lat,lng],{icon:markerIcon("🐝","Beekeeper")}).addTo(leafletMap).bindPopup("<b>Beekeeper GPS</b><br>Live browser location");
  sensorMarker=L.circleMarker([lat+0.0022,lng-0.002],{radius:8,weight:2}).addTo(leafletMap).bindPopup("<b>Hive IoT Sensor</b><br>Temperature + humidity");
  state.tracking.openBatchIds.forEach((id,index)=>{
    ensureTrackingBatch(id); const tr=state.tracking.batchFeeds[id];
    truckPaths[id]=[[tr.lat,tr.lng]];
    truckMarkers[id]=L.marker([tr.lat,tr.lng],{icon:markerIcon("🚚",id)}).addTo(leafletMap).bindPopup(`<b>HoneyChain Truck</b><br>Batch ${id}<br>Destination: ${esc(getTrackingBatch(id)?.customerAddress||"Not set")}<br>Simulated live GPS`);
    truckLines[id]=L.polyline(truckPaths[id],{weight:5,opacity:.55}).addTo(leafletMap);
    const customer=getTrackingBatch(id)||{};
    const customerLabel=customer.customerName?`Customer • ${customer.customerName}`:"Customer Destination";
    if(Number.isFinite(Number(tr.customerLat)) && Number.isFinite(Number(tr.customerLng))){
      customerMarkers[id]=L.marker([tr.customerLat,tr.customerLng],{icon:markerIcon("👤",customerLabel)}).addTo(leafletMap).bindPopup(`<b>Customer Destination</b><br>${esc(customer.customerName||"Customer")}<br>Phone: ${esc(customer.customerPhone||"—")}<br>${esc(customer.customerAddress||"Address not set")}<br><small>Mapped from the saved delivery address</small>`);
      customerLines[id]=L.polyline([[tr.lat,tr.lng],[tr.customerLat,tr.customerLng]],{weight:3,opacity:.45,dashArray:"7 7"}).addTo(leafletMap);
    }
  });
  if(fallback)fallback.style.display="none";
  trackingMapFitted=false;
  setTimeout(()=>{if(leafletMap){leafletMap.invalidateSize();fitTrackingMap();}},150);
}
function refreshTrackingUI(){
  const b=state.tracking.beekeeper,s=state.tracking.sensor;
  const selected=state.tracking.selectedBatchId; const tr=selected?state.tracking.batchFeeds[selected]:null;
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val};
  set("beekeeper-coords",b.live?`${b.lat}, ${b.lng}`:"Waiting for location"); set("beekeeper-status",b.live?"LIVE":"WAITING"); const bs=document.getElementById("beekeeper-status");if(bs)bs.className=b.live?"ok":"";
  set("beekeeper-accuracy",b.accuracy?`${b.accuracy} m`:"—"); set("beekeeper-updated",b.updatedAt?new Date(b.updatedAt).toLocaleTimeString():"—");
  const er=document.getElementById("beekeeper-error");if(er){er.textContent=b.error?`${b.error}. Allow browser location permission.`:"";er.style.display=b.error?"block":"none"}
  set("selected-batch-title",selected||"No batch selected"); set("truck-coords",tr?`${tr.lat.toFixed(5)}, ${tr.lng.toFixed(5)}`:"—"); set("truck-speed",tr?`${tr.speed} km/h`:"—"); set("truck-updated",tr?new Date(tr.updatedAt).toLocaleTimeString():"—");
  const customer=selected?getTrackingBatch(selected):null; set("tracking-customer-name",customer?.customerName||"—"); set("tracking-customer-phone",customer?.customerPhone||"—"); set("tracking-destination",customer?.customerAddress||"—");
  set("sensor-temperature",`${s.temperature}°C`);set("sensor-humidity",`${s.humidity}%`);set("sensor-status",s.live?"LIVE SENSOR STREAM":"OFFLINE");
  state.tracking.openBatchIds.forEach(id=>{
    const feed=state.tracking.batchFeeds[id]; if(!feed) return;
    if(leafletMap&&truckMarkers[id]){
      truckMarkers[id].setLatLng([feed.lat,feed.lng]);
      truckPaths[id]=(truckPaths[id]||[]); truckPaths[id].push([feed.lat,feed.lng]); if(truckPaths[id].length>120)truckPaths[id].shift();
      if(truckLines[id])truckLines[id].setLatLngs(truckPaths[id]);
      const cLat=feed.customerLat, cLng=feed.customerLng;
      if(Number.isFinite(Number(cLat)) && Number.isFinite(Number(cLng))){
        if(!customerMarkers[id]){
          const customer=getTrackingBatch(id)||{};
          const customerLabel=customer.customerName?`Customer • ${customer.customerName}`:"Customer Destination";
          customerMarkers[id]=L.marker([Number(cLat),Number(cLng)],{icon:markerIcon("👤",customerLabel)}).addTo(leafletMap).bindPopup(`<b>Customer Destination</b><br>${esc(customer.customerName||"Customer")}<br>Phone: ${esc(customer.customerPhone||"—")}<br>${esc(customer.customerAddress||"Address not set")}<br><small>Fixed to the saved delivery address</small>`);
          customerLines[id]=L.polyline([[feed.lat,feed.lng],[Number(cLat),Number(cLng)]],{weight:3,opacity:.45,dashArray:"7 7"}).addTo(leafletMap);
          trackingMapFitted=false;
        }
        customerMarkers[id].setLatLng([Number(cLat),Number(cLng)]);
        if(customerLines[id]) customerLines[id].setLatLngs([[feed.lat,feed.lng],[Number(cLat),Number(cLng)]]);
      }
    }
  });
  if(leafletMap&&beeMarker){
    const beeLat=b.lat??(tr?tr.lat:11.0168),beeLng=b.lng??(tr?tr.lng:76.9558);
    beeMarker.setLatLng([beeLat,beeLng]); if(sensorMarker)sensorMarker.setLatLng([beeLat+0.0022,beeLng-0.002]);
    fitTrackingMap();
  }
  const list=document.getElementById("tracking-batch-list");
  if(list){list.innerHTML=state.tracking.openBatchIds.map(id=>{const f=state.tracking.batchFeeds[id]||{};const active=id===state.tracking.selectedBatchId;return `<button class="tracking-tab ${active?"active":""}" data-action="selectTrackingBatch" data-track-batch="${esc(id)}"><span>🚚</span><span><b>${esc(id)}</b><small>${f.speed||0} km/h • ${active?"Viewing":"Open"}</small></span><i data-action="removeTrackingBatch" data-track-batch="${esc(id)}">×</i></button>`}).join("");}
}

function render(){
 const user=state.user,batches=Object.values((state.batches&&typeof state.batches==="object")?state.batches:{}).reverse().filter(b=>b&&typeof b==="object"),total=batches.reduce((s,b)=>s+Number(b.quantity||0),0);
 let content="";
 if(state.page==="home")content=`<main><section class="hero"><div class="hero-copy"><div class="eyebrow">BLOCKCHAIN + SMART AGRICULTURE</div><h1>From Hive to Home.<br><em>Every Drop. Verified.</em></h1><p>Blockchain-powered honey traceability and smart beekeeping management — connecting the hive, farmer, processor, distributor and consumer through one trusted ecosystem.</p>${!state.user?`<div class="home-access"><button class="access-card primary-access" data-action="login"><span class="access-icon">🍯</span><span><strong>Beekeeper Login</strong><small>Create batches, monitor hives & track deliveries</small></span></button><button class="access-card" data-action="customerLogin"><span class="access-icon">👤</span><span><strong>Customer Login</strong><small>Scan QR & view verified honey journey</small></span></button></div>`:`<div class="actions">${state.user?.role==="customer"?`<button class="btn primary" data-action="verifyPage">Scan Honey QR →</button>${state.verified?.batchId?`<button class="btn secondary home-live" data-action="tracking">🚚 Live Tracking</button>`:""}`:`<button class="btn primary" data-action="dashboard">Explore HoneyChain →</button><button class="btn secondary home-live" data-action="tracking">🚚 Live Tracking</button>`}<button class="btn secondary" data-action="verifyPage">Verify Honey</button></div>`}<div class="trust">✓ 100% Transparent Supply Chain</div></div><div class="hero-art"><div class="glow"></div><div class="jar">🍯</div><div class="float fa">✓ Blockchain Verified</div><div class="float fb">99.1% Purity</div><div class="float fc">Traceable</div><div class="float fd">Origin Verified</div></div></section><section class="section"><div class="section-head"><div><div class="eyebrow">THE JOURNEY</div><h2>How HoneyChain works</h2></div><p>Every important stage becomes a traceable record.</p></div><div class="steps">${["Hive Monitoring","Smart Harvesting","Blockchain Recording","Processing","Packaging","Distribution","Consumer Verification"].map((x,i)=>`<div class="step"><small>0${i+1}</small><b>${x}</b><span>Verified record</span></div>`).join("")}</div></section></main>`;
 if(state.page==="dailySales"&&user&&user.role!=="customer"){
  const rows=todaySales();
  const sold=rows.reduce((sum,x)=>sum+Number(x.quantity||0),0);
  const revenue=rows.reduce((sum,x)=>sum+Number(x.totalAmount||0),0);
  content=`<main class="page"><div class="title"><div><div class="eyebrow">BEEKEEPER SALES CENTER</div><h2>Daily Sales</h2><p>All customer orders registered today, separated from the dashboard for easy sales tracking.</p></div><button class="btn primary" data-action="batch">+ Add Honey Batch</button></div><div class="metrics">${[[rows.length,"Sales Today"],[sold.toFixed(1)+" kg","Honey Sold"],[formatINR(revenue),"Revenue Today"],[new Set(rows.map(x=>x.honeyType||"Honey")).size,"Honey Types"],[new Set(rows.map(x=>x.customerName||"Customer")).size,"Customers"],[rows.length?"Active":"No Sales","Status"]].map(([v,l])=>`<div class="metric"><small>${l}</small><strong>${esc(v)}</strong><em>${rows.length?"Live • Updated":"Waiting for orders"}</em></div>`).join("")}</div><div class="panel daily-sales-page-panel"><div class="daily-sales-head"><div><div class="eyebrow">TODAY'S ORDER LEDGER</div><h3>Sales made today</h3></div><span class="pill" style="background:#eef7ef;color:#2d7d4c">${dateText(new Date().toISOString().slice(0,10))}</span></div>${rows.length?`<div class="sales-table sales-page-table">${rows.map(x=>`<div class="sale-row sales-page-row"><span><b>${esc(x.batchId)}</b><small>${esc(x.honeyType||"Honey")} • ${esc(x.customerName||"Customer")} • ${esc(formatPhone(x.countryCode,x.customerPhone)||x.customerPhone||"—")}</small></span><span>${Number(x.quantity||0).toFixed(1)} kg</span><strong>${formatINR(x.totalAmount||0)}</strong></div>`).join("")}</div>`:`<div class="sales-empty">No sales have been registered today. Completed customer batches will appear here automatically.</div>`}</div></main>`;
 }
 if(state.page==="dashboard"&&user){
  if(!dashboardSelectedBatchId || !state.batches[dashboardSelectedBatchId]) dashboardSelectedBatchId=batches[0]?.batchId||null;
  if(dashboardSelectedBatchId && (!temperatureHistory.length || dashboardSelectedBatchId!==state._lastTempBatch)){resetDashboardTemperatureForBatch(dashboardSelectedBatchId);state._lastTempBatch=dashboardSelectedBatchId;}
  const selectedBatch=dashboardSelectedBatchId?state.batches[dashboardSelectedBatchId]:null;
  const selectedTemp=selectedBatch?batchTemperatureBase(selectedBatch.batchId):31.1;
  content=`<main class="page"><div class="title"><div><div class="eyebrow">BEEKEEPER CONTROL CENTER</div><h2>Welcome, ${esc(user.name)}</h2><p>Smart hive monitoring and honey production overview.</p></div><button class="btn primary" data-action="batch">+ Add Honey Batch</button></div><div class="metrics">${[["24","Active Hives"],["<span id=\"dash-temperature-value\">${selectedTemp.toFixed(1)}°C</span>","Temperature"],["68%","Humidity"],["42.8 kg","Hive Weight"],[total+" kg","Honey Production"],["2","Alerts"]].map(([v,l])=>`<div class="metric"><small>${l}</small><strong>${v}</strong><em>Live • Updating</em></div>`).join("")}</div><div class="dash"><div class="panel chart"><div class="eyebrow">SMART MONITORING</div><div class="chart-title-row"><div><h3>Temperature trends</h3><div class="selected-temp-batch">Showing live temperature for <b>${selectedBatch?esc(selectedBatch.batchId):"No batch"}</b>${selectedBatch?` • ${esc(selectedBatch.honeyType)}`:""}</div></div><span class="live-chart-badge"><i></i> LIVE SENSOR FEED</span></div><div class="live-chart-wrap"><svg id="dash-temperature-chart" viewBox="0 0 700 220" preserveAspectRatio="none" aria-label="Live temperature trend"><defs><linearGradient id="tempFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#d89000" stop-opacity=".20"/><stop offset="100%" stop-color="#d89000" stop-opacity="0"/></linearGradient></defs><path id="dash-temperature-fill" d="${temperaturePath(temperatureHistory)} L690 210 L10 210 Z" fill="url(#tempFill)" opacity=".55"></path><path id="dash-temperature-path" d="${temperaturePath(temperatureHistory)}" fill="none" stroke="#d89000" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path><circle id="dash-temperature-dot" cx="690" cy="${buildTemperaturePoints(temperatureHistory).slice(-1)[0][1]}" r="6" fill="#fff" stroke="#d89000" stroke-width="3"></circle></svg></div><div class="chart-stats"><span>Current <b id="dash-temperature-latest">31.1°C</b></span><span>Min <b id="dash-temperature-min">30.4°C</b></span><span>Max <b id="dash-temperature-max">31.9°C</b></span></div><p class="chart-note">Updating from the live hive sensor stream every 1.5 seconds.</p></div><div class="sales-column"><div class="panel history"><div class="eyebrow">HARVEST HISTORY</div><div class="history-head"><h3>Recent batches</h3>${batches.length?`<div class="history-tools"><label class="history-select-all"><input type="checkbox" data-select-all-batches> Select all</label><button class="btn secondary delete-selected" data-action="deleteSelectedBatches">Delete selected</button></div>`:""}</div>${batches.length?batches.map(b=>`<div class="batchrow ${dashboardSelectedBatchId===b.batchId?"selected-temp-row":""}" data-batch="${esc(b.batchId)}" data-dashboard-batch="${esc(b.batchId)}"><input class="batch-check" type="checkbox" data-select-batch="${esc(b.batchId)}" aria-label="Select ${esc(b.batchId)}"><span class="batch-main"><span>🍯</span><span><b>${esc(b.batchId)}</b><small>${dateText(b.harvestDate)} • ${esc(b.honeyType)}</small></span></span><strong>${esc(b.quantity)} kg</strong></div>`).join(""):`<div class="nodata">No batches yet.</div>`}</div><div class="panel daily-sales-panel"><div class="daily-sales-head"><div><div class="eyebrow">SALES OVERVIEW</div><h3>Today's Sales</h3></div><span class="pill" style="background:#eef7ef;color:#2d7d4c">LIVE SALES LEDGER</span></div><div class="sales-metrics"><div><small>Sales</small><strong>${todaySales().length}</strong></div><div><small>Honey Sold</small><strong>${todaySales().reduce((s,x)=>s+Number(x.quantity||0),0).toFixed(1)} kg</strong></div><div><small>Revenue</small><strong>${formatINR(todaySales().reduce((s,x)=>s+Number(x.totalAmount||0),0))}</strong></div></div><div class="sales-table">${todaySales().length?todaySales().map(x=>`<div class="sale-row"><span><b>${esc(x.batchId)}</b><small>${esc(x.honeyType)} • ${esc(x.customerName||"Customer")}</small></span><span>${Number(x.quantity||0).toFixed(1)} kg</span><strong>${formatINR(x.totalAmount||0)}</strong></div>`).join(""):`<div class="nodata">No sales recorded today yet.</div>`}</div></div></div></main>`;
 }
 if(state.page==="batch"&&user)content=`<main class="page"><div class="title"><div><div class="eyebrow">BATCH REGISTRATION</div><h2>Create a traceable batch</h2><p>Complete each stage to register the batch.</p></div></div>${wizard()}</main>`;
 if(state.page==="tracking")content=trackingPage();
 if(state.page==="verify"){
  const isCustomerUser=state.user?.role==="customer";
  const scannerOnlyNotice="";
  const fallbackTools=`<div class="scan-note upload-help">You can upload the QR image anytime, or use the camera above.</div>${isCustomerUser?"":`<div class="verify-tools"><div class="lookup"><input id="verify-input" value="${esc(state.verifyId)}" placeholder="HC-001"><button class="btn primary" data-action="verify">Verify Batch ID</button></div></div>`}`;
  content=`<main class="page"><div class="title"><div><div class="eyebrow">CONSUMER AUTHENTICATION</div><h2>Scan. Verify. Trust.</h2><p>${isCustomerUser?"Scan the beekeeper-issued QR code to reveal the complete honey record and live delivery information.":"Scan the package QR code or enter a Batch ID to reveal its full journey."}</p></div></div><div class="verifygrid"><div class="panel scanpanel"><div class="qrbox"><div class="scan-title">QR CODE SCANNER</div><div id="qr-reader"></div><div class="scan-note">Point the camera at the complete QR code. Keep it steady until the status changes to <b>QR detected</b>.</div><div class="upload-qr prominent-upload"><label class="upload-qr-label" for="qr-image-upload">📁 Upload QR Image</label><input id="qr-image-upload" type="file" accept="image/png,image/jpeg,image/webp"></div><div class="scan-actions"><button class="btn primary" data-action="startScanner">Start Camera Scanner</button><button class="btn secondary" data-action="stopScanner">Stop Scanner</button></div>${fallbackTools}<div id="scanner-status" class="scanner-status" style="display:block">Ready to scan…</div><div id="scanner-error" class="scanner-error"></div></div></div><div class="panel result">${state.verified?consumerStory(state.verified):`<div class="empty"><h3>${isCustomerUser?"Customer verification":"Consumer verification"}</h3><p>${isCustomerUser?"Start the camera and scan a beekeeper-issued HoneyChain QR code. After detection, the verified product, customer, traceability, delivery, and live sensor information will appear here.":"Scan a registered HoneyChain QR code or enter a Batch ID. The verified result will show the product identity, complete traceability timeline, live delivery status, and current IoT conditions."}</p></div>`}</div></div></main>`;
 }
 if(state.page!=="dashboard") stopDashboardTemperature();
 root.innerHTML=`<div class="app"><div class="cursor"></div><div class="bee-layer"><div class="bee">🐝</div></div><header class="nav"><button class="brand" data-action="home"><span class="brand-icon">🍯</span><span><strong>HoneyChain</strong><small>Trusted • Traceable • Smart</small></span></button><nav class="nav-links"><button data-action="home" class="${state.page==="home"?"active":""}">Home</button>${user?.role!=="customer"?`<button data-action="dashboard" class="${state.page==="dashboard"?"active":""}">Dashboard</button><button data-action="dailySales" class="${state.page==="dailySales"?"active":""} sales-nav-btn" style="display:inline-block!important;visibility:visible!important;opacity:1!important;">Daily Sales</button><button data-action="batch" class="${state.page==="batch"?"active":""}">Add Batch</button>`:""}<button data-action="verifyPage" class="${state.page==="verify"?"active":""}">Verify</button>${user?`<button data-action="tracking" class="${state.page==="tracking"?"active":""}">Live Tracking</button>`:""}</nav>${user&&user.role!=="customer"?`<button data-action="dailySales" class="daily-sales-floating" style="position:fixed;left:18px;top:92px;z-index:45;border:1px solid #e1c48a;background:#fff4d7;color:#9a5b00;border-radius:999px;padding:7px 11px;font-size:10px;font-weight:900;box-shadow:0 6px 16px rgba(98,65,20,.10);">Daily Sales</button>`:""}${user?`<div class="userbar"><span class="avatar">${esc(user.name[0]||"U")}</span><span><strong>${esc(user.name)}</strong><small>${esc(user.email)} • ${user.role==="customer"?"Customer":"Beekeeper"}</small></span><button data-action="logout">Logout</button></div>`:`<div class="login-actions"><button class="login-btn" data-action="login">Beekeeper Login</button><button class="login-btn customer-login-btn" data-action="customerLogin">Customer Login</button></div>`}</header>${content}<footer>HoneyChain • Blockchain-based honey traceability and smart beekeeping management.</footer>${state.auth?authModal():""}</div>`;
 if(state.page==="dashboard"&&user){setTimeout(()=>startDashboardTemperature(),0);}
 if(state.page==="tracking"){setTimeout(async()=>{await initRealMap();refreshTrackingUI()},0);}
}
function dateText(d){if(!d)return"—";return new Date(d+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}
function selectDashboardBatch(id){
  const key=String(id||"").toUpperCase();
  if(!key || !state.batches[key]) return;
  dashboardSelectedBatchId=key;
  resetDashboardTemperatureForBatch(key);
  render();
  window.scrollTo({top:0,behavior:"smooth"});
}
document.addEventListener("submit",e=>{if(e.target.id==="auth-form"){e.preventDefault();submitAuth(e.target)}})
document.addEventListener("input",e=>{if(e.target.matches("[data-field]")){let value=e.target.value;const field=e.target.dataset.field;if(field==="customerPhone"){value=value.replace(/\D/g,"").slice(0,10);if(e.target.value!==value)e.target.value=value}
if(field==="customCountryCode"){value=value.replace(/[^+\d]/g,"");if(value&&value.charAt(0)!=="+")value="+"+value;value=value.slice(0,5)}state.batch[field]=value;if(["qualityPurity","qualityMoisture","qualityColour","qualityStatus"].includes(field)){syncQualitySummary();const qs=document.getElementById("quality-summary");if(qs)qs.textContent=state.batch.quality}if(field==="location"){saveOrigin(value)}}if(e.target.id==="verify-input")state.verifyId=e.target.value})
document.addEventListener("change",e=>{if(e.target&&e.target.id==="qr-image-upload"&&e.target.files&&e.target.files[0])scanQrImage(e.target.files[0]); if(e.target&&e.target.matches("[data-field=\"sendCustomerDetails\"]")){state.batch.sendCustomerDetails=!!e.target.checked;} if(e.target&&e.target.matches("[data-field=\"countryCode\"]")){state.batch.countryCode=e.target.value;render();return;} if(e.target&&e.target.matches("[data-field=\"messageChannel\"]")){state.batch.messageChannel=e.target.value;} if(e.target&&e.target.matches("[data-field=\"honeyType\"]")){state.batch.honeyType=e.target.value; state.batch.hiveId=nextHiveId(e.target.value); state.batch.pricePerKg=priceForHoney(e.target.value); state.batch.totalAmount=(Number(state.batch.quantity)||0)*state.batch.pricePerKg; render();}});
document.addEventListener("change",e=>{
 if(e.target&&e.target.matches("[data-select-batch]")){
   const row=e.target.closest(".batchrow"); if(row) row.classList.toggle("batch-selected-row",e.target.checked);
   const boxes=[...document.querySelectorAll("[data-select-batch]")];
   const selected=boxes.filter(b=>b.checked).length;
   const all=document.querySelector("[data-select-all-batches]");
   if(all){all.checked=boxes.length>0&&selected===boxes.length;all.indeterminate=selected>0&&selected<boxes.length;}
 }
 if(e.target&&e.target.matches("[data-select-all-batches]")){
   const checked=e.target.checked;
   document.querySelectorAll("[data-select-batch]").forEach(b=>{b.checked=checked; const row=b.closest(".batchrow"); if(row) row.classList.toggle("batch-selected-row",checked);});
 }
});
document.addEventListener("click",e=>{const row=e.target.closest("[data-dashboard-batch]");if(row && state.page==="dashboard" && !e.target.closest("input[type=checkbox]") && !e.target.closest("button")){e.preventDefault();selectDashboardBatch(row.dataset.dashboardBatch);return;}});
document.addEventListener("click",e=>{const row=e.target.closest("[data-batch]");if(row&&state.page!=="dashboard"&&!e.target.closest("button[data-action]")&&!e.target.closest("input[type=checkbox]")){state.verifyId=row.dataset.batch;nav("verify")}});
document.addEventListener("click",e=>{const btn=e.target.closest("[data-action]");if(!btn)return;const a=btn.dataset.action;if(a==="dashboard"){e.preventDefault();actions.dashboard();return}const arg=btn.dataset.trackBatch||undefined;if(a==="openTracking"){e.preventDefault();actions.openTracking(arg);return}if(a==="selectTrackingBatch"){e.preventDefault();actions.selectTrackingBatch(arg);return}if(a==="removeTrackingBatch"){e.preventDefault();e.stopPropagation();actions.removeTrackingBatch(arg);return}if(actions[a])actions[a]();if(a&&a.startsWith("step")){const n=Number(a.slice(4));if(n<state.step){state.step=n;render()}}});
render();
})();
