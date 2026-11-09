import {copy} from './demos.js';
export function familyState(d){
 if(!d.hasSpeech)return {risk:'idle',title:d.status==='stopped'?'Listening stopped':'Waiting for speech',message:'No speech has been analyzed. No safety assessment is available.'};
 if(d.status==='stopped')return {risk:'idle',title:'Listening stopped',message:`Last warning: ${copy[d.language][d.risk]}. This is a past assessment, not live protection.`};
 return {risk:d.risk,title:copy[d.language][d.risk],message:copy[d.language][d.risk+'Text']};
}
