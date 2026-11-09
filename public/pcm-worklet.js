class PcmCapture extends AudioWorkletProcessor {
 constructor(){super();this.frame=new Int16Array(512);this.offset=0;}
 process(inputs){const channel=inputs[0]?.[0];if(channel)for(const value of channel){const x=Math.max(-1,Math.min(1,value));this.frame[this.offset++]=x<0?x*32768:x*32767;if(this.offset===512){this.port.postMessage(this.frame.buffer,[this.frame.buffer]);this.frame=new Int16Array(512);this.offset=0;}}return true;}
}
registerProcessor('pcm-capture',PcmCapture);
