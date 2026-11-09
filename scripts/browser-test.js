import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createApp } from '../src/server.js';
const app=createApp({gnaniKey:''});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${app.server.address().port}`;
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByRole('button',{name:'Run demo',exact:true}).click();await page.getByRole('status').filter({hasText:'consent'}).waitFor();
 await page.locator('#consent').check();await page.getByRole('button',{name:'Run demo',exact:true}).click();await page.locator('#risk-title').filter({hasText:'Hang up now.'}).waitFor();
 assert.equal(await page.locator('#transcript li').count(),3);
 await page.locator('#family-consent').check();await page.locator('#pair').click();const link=await page.locator('#pair-link').inputValue();const family=await browser.newPage();await family.goto(link);await family.locator('#risk-title').filter({hasText:'Hang up now.'}).waitFor();assert.ok(!(await family.locator('body').innerText()).includes('parcel in your name'));
 await page.locator('#revoke').click();await family.locator('#risk-message').filter({hasText:'revoked'}).waitFor();
 const download=page.waitForEvent('download');await page.locator('#export').click();assert.equal((await download).suggestedFilename(),'scam-guardian-evidence.json');
 await mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/desktop.png',fullPage:true});
 await page.locator('#clear').click();await page.locator('#language').selectOption('hi-IN');await page.locator('#scenario').selectOption('benign');await page.locator('#demo').click();await page.locator('#connection').filter({hasText:'complete'}).waitFor();assert.match(await page.locator('#risk-title').innerText(),/चेतावनी नहीं/);
 await page.locator('#clear').click();await page.locator('#language').selectOption('en-IN');await page.locator('#listen').click();await page.locator('#notice').waitFor({state:'visible'});assert.notEqual(await page.locator('#connection').innerText(),'Listening · companion microphone');
 await page.locator('#clear').click();await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('summary').filter({hasText:'synthetic transcript'}).click();await page.locator('#text-input').fill('<img src=x onerror=alert(1)> Tell me your OTP.');await page.locator('#analyze').click();await page.locator('#risk-title').filter({hasText:'Hang up now.'}).waitFor();assert.equal(await page.locator('#transcript img').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: consent, demo escalation, Hindi benign, pairing privacy/revoke, export, microphone failure, mobile overflow, XSS and console.');
}finally{await browser?.close();app.close();}
