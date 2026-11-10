export async function startCapture(session,onEvent,onError){
 let stream,context,node,socket,source,stopped=false,paused=false;
 const stop=()=>{if(stopped)return;stopped=true;stream?.getTracks().forEach(t=>t.stop());node?.disconnect();source?.disconnect();socket?.close();context?.close().catch(()=>{});};
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Microphone access requires localhost or HTTPS. Use the synthetic demo here.');
  // Raw audio (decision 24): browser noise suppression and gain control would erase the phone-line signature that
  // tells the caller's voice from the senior's.
  stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
  context=new AudioContext({sampleRate:16000});await context.resume();
  await context.audioWorklet.addModule('/pcm-worklet.js');
  socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/listen?session=${encodeURIComponent(session)}&rate=${context.sampleRate}`);
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Speech connection timed out. Try again.')),15000);
   socket.onmessage=event=>{let d;try{d=JSON.parse(event.data);}catch{return;}if(d.type==='ready'){clearTimeout(timer);resolve();}else if(d.type==='error'){clearTimeout(timer);reject(Error(d.message));}};
   socket.onerror=()=>{clearTimeout(timer);reject(Error('Could not connect to speech service.'));};
   socket.onclose=()=>{clearTimeout(timer);reject(Error('Speech connection closed before it was ready.'));};
  });
  // The server now reconnects to the speech service by itself and reports health; only an error message is final.
  socket.onmessage=event=>{let d;try{d=JSON.parse(event.data);}catch{return;}if(d.type==='error'){onError(d.message);stop();}else onEvent(d);};
  socket.onclose=()=>{if(!stopped){onError('Connection ended. Listening has stopped.');stop();}};
  socket.onerror=()=>{if(!stopped){onError('Connection failed. Listening has stopped.');stop();}};
  node=new AudioWorkletNode(context,'pcm-capture');source=context.createMediaStreamSource(stream);
  const stuckBytes=context.sampleRate*2*6; // six seconds of audio stuck in the browser socket means the link is gone
  node.port.onmessage=event=>{if(stopped||paused)return;if(socket.readyState!==WebSocket.OPEN||socket.bufferedAmount>stuckBytes){onError('Audio connection is falling behind. Start again.');stop();return;}socket.send(event.data);};
  source.connect(node);node.connect(context.destination);
  stream.getAudioTracks()[0].onended=()=>{if(!stopped){onError('Microphone disconnected.');stop();}};
  // Tell the server about pauses so it can keep the audio clock running and show that checking is paused.
  const tell=type=>{if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type}));};
  // Stop the microphone at once, but give the server a moment to finalise the last utterance before closing.
  const finish=()=>{if(stopped)return;tell('stop');stream?.getTracks().forEach(t=>t.stop());paused=true;setTimeout(stop,1600);};
  return {stop:finish,pause(value){if(value===paused)return;paused=value;tell(value?'pause':'resume');},sampleRate:context.sampleRate};
 }catch(e){stop();throw e;}
}
