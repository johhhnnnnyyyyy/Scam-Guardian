// One provider request at a time. Superseded audio never reaches playback.
export function warningQueue({prepare,play,onError}){
 let pending=null,current=null,running=false,version=0;
 const key=item=>JSON.stringify(item);
 async function drain(){if(running)return;running=true;try{while(pending){const item=pending;current=item;pending=null;const v=version;try{const value=await prepare(item);if(v!==version||pending)continue;await play(value,item);}catch(e){if(v===version&&!pending)onError(e);}finally{current=null;}}}finally{running=false;}}
 return {enqueue(item){if(key(item)===key(pending)||key(item)===key(current))return;pending=item;version++;return drain();},cancel(){pending=null;current=null;version++;}};
}
