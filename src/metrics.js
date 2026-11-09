export function wordErrorRate(reference,hypothesis){
 const tokenize=s=>s.normalize('NFC').toLocaleLowerCase().replace(/[\p{P}\p{S}]/gu,' ').split(/\s+/u).filter(Boolean);
 const a=tokenize(reference),b=tokenize(hypothesis);let row=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(row[j]+1,next[j-1]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}
 return {referenceWords:a.length,errors:row[b.length],wer:a.length?row[b.length]/a.length:null,tokenization:'NFC lowercase, punctuation stripped, whitespace words'};
}
