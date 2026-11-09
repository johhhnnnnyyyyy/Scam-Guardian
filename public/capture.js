export async function startCapture(session,onEvent,onError){
 let stream,context,node,socket,source,stopped=false,paused=false;
 const stop=()=>{if(stopped)return;stopped=true;stream?.getTracks().forEach(t=>t.stop());node?.disconnect();source?.disconnect();socket?.close();context?.close().catch(()=>{});};
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Microphone access requires localhost or HTTPS. Use the synthetic demo here.');
  stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
  context=new AudioContext({sampleRate:16000});await context.resume();
  await context.audioWorklet.addModule('/pcm-worklet.js');
  socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/listen?session=${encodeURIComponent(session)}&rate=${context.sampleRate}`);
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Speech connection timed out. Try again.')),15000);
   socket.onmessage=event=>{let d;try{d=JSON.parse(event.data);}catch{return;}if(d.type==='ready'){clearTimeout(timer);resolve();}else if(d.type==='error'){clearTimeout(timer);reject(Error(d.message));}};
   socket.onerror=()=>{clearTimeout(timer);reject(Error('Could not connect to speech service.'));};
   socket.onclose=()=>{clearTimeout(timer);reject(Error('Speech connection closed before it was ready.'));};
  });
  socket.onmessage=event=>{try{const d=JSON.parse(event.data);if(d.type==='error'){onError(d.message);stop();}else onEvent(d);}catch{onError('Unexpected speech response.');stop();}};
  socket.onclose=()=>{if(!stopped){onError('Connection ended. Listening has stopped.');stop();}};
  socket.onerror=()=>{if(!stopped){onError('Connection failed. Listening has stopped.');stop();}};
  node=new AudioWorkletNode(context,'pcm-capture');source=context.createMediaStreamSource(stream);
  node.port.onmessage=event=>{if(stopped||paused)return;if(socket.readyState!==WebSocket.OPEN||socket.bufferedAmount>64000){onError('Audio connection is falling behind. Start again.');stop();return;}socket.send(event.data);};
  source.connect(node);node.connect(context.destination);
  stream.getAudioTracks()[0].onended=()=>{if(!stopped){onError('Microphone disconnected.');stop();}};
  return {stop,pause(value){paused=value;},sampleRate:context.sampleRate};
 }catch(e){stop();throw e;}
}
