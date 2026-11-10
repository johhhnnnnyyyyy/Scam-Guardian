import {copy} from './demos.js';
export function familyState(d){
 if(!d.hasSpeech)return {risk:'idle',title:d.status==='stopped'?'Listening stopped':'Waiting for speech',message:'No speech has been analyzed. No safety assessment is available.'};
 if(d.status==='stopped')return {risk:'idle',title:'Listening stopped',message:`Last warning: ${copy[d.language][d.risk]}. This is a past assessment, not live protection.`};
 if(d.risk==='safe'&&d.mode==='live'&&d.health&&!['listening','idle'].includes(d.health))return {risk:'idle',title:'Not checking right now',message:d.health==='reconnecting'?'The speech connection dropped and is reconnecting. Calls are not being checked until it returns.':d.health==='paused'?'Paused while a warning plays.':d.health==='stt_degraded'?'The speech service is struggling; warnings may be delayed.':'Listening is not active. Nothing is being checked.'};
 if(d.risk==='safe'&&d.coverage==='unknown_language')return {risk:'idle',title:'Language not covered',message:'This speech is in a language the rules do not cover yet. No safety assessment is available.'};
 if(d.risk==='safe'&&d.coverage==='partial')return {risk:'idle',title:'Partly covered',message:'Part of this speech is in a language the rules only partly cover. No warning detected, but this is not a full assessment.'};
 if(d.risk==='careful'&&d.uncertain)return {risk:'careful',title:copy[d.language].careful,message:'This is close to a known scam pattern. Consider calling them now on a number you trust.'};
 return {risk:d.risk,title:copy[d.language][d.risk],message:copy[d.language][d.risk+'Text']};
}
