import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('./main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('./styles.css',import.meta.url),'utf8');
let n=0;function test(name,fn){try{fn();n++;console.log(`✓ ${name}`)}catch(e){console.error(`✗ ${name}\n  ${e.message}`);process.exitCode=1}}
test('page has one main landmark and a skip link',()=>{assert.equal((html.match(/<main\b/g)||[]).length,1);assert.match(html,/class="skip-link" href="#main"/)});
test('every workflow view has labelled heading',()=>{for(const s of ['brief','results','compare','decision'])assert.match(html,new RegExp(`id="view-${s}"[\\s\\S]*?aria-labelledby=`))});
test('all form fields have explicit labels',()=>{for(const id of ['app-brief','tone','extension','budget'])assert.match(html,new RegExp(`<label[^>]*for="${id}"`))});
test('founder content is rendered with textContent, never interpolated into innerHTML',()=>{assert.doesNotMatch(js,/innerHTML\s*=/);assert.match(js,/textContent/)});
test('responsive and reduced-motion styles exist',()=>{assert.match(css,/@media\(max-width:/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/)});
test('legal limitation is visible in brief and decision views',()=>{assert.match(html,/Recommendation, not legal clearance/);assert.match(html,/professional trademark review/)});
test('four checks are named in visible UI',()=>{assert.match(html,/Existing use · Domain · Affordability · Trademark/)});
console.log(`\n${n} frontend structure tests passed`);if(process.exitCode)process.exit(process.exitCode);
