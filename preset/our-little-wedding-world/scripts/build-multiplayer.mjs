import {mkdir,cp,writeFile,rm,readFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/server',{recursive:true});await mkdir('dist/client',{recursive:true});
for(const name of ['index.html','style.css','game.js','config.js','cms-bootstrap.js','admin.html','admin.js','admin.css','favicon.svg','assets'])await cp('public/'+name,'dist/client/'+name,{recursive:true});
await cp('worker','dist/server',{recursive:true});
// Bundle HTML directly: asset canonical redirects can otherwise produce an empty 200.
await writeFile('dist/server/page-templates.js', 'export const invitationHtml='+JSON.stringify(await readFile('public/index.html','utf8'))+';\nexport const adminHtml='+JSON.stringify(await readFile('public/admin.html','utf8'))+';\n');
await writeFile('dist/server/wrangler.json',JSON.stringify({name:'wedding-garden',main:'index.js',compatibility_date:'2026-01-01',assets:{directory:'../client',binding:'ASSETS',run_worker_first:true,html_handling:'none'},r2_buckets:[{binding:'MEDIA',bucket_name:'wedding-media'}],d1_databases:[{binding:'DB',database_name:'wedding-garden',database_id:'local-preview'}]}));
await mkdir('dist/.openai',{recursive:true});await cp('.openai/hosting.json','dist/.openai/hosting.json');
