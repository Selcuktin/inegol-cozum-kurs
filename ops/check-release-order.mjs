// Prevent an older main branch from replacing a manually published, newer commit.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export function checkReleaseOrder(productionSha,headSha,isAncestor){
  assert(/^[a-f0-9]{40}$/i.test(productionSha||''),'Production deployment must identify its Git commit');
  assert(/^[a-f0-9]{40}$/i.test(headSha||''),'Release must identify its Git commit');
  assert(productionSha===headSha||isAncestor(productionSha,headSha),'Release does not include the current production commit. Merge the published changes first.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const {CLOUDFLARE_API_TOKEN:token,CLOUDFLARE_ACCOUNT_ID:account}=process.env;
  assert(token&&account,'Cloudflare release credentials missing');
  const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/inegol-cozum-kurs`,{headers:{Authorization:`Bearer ${token}`}}),data=await response.json();
  assert(response.ok&&data.success,'Could not verify the production deployment');
  const sha=data.result.canonical_deployment?.deployment_trigger?.metadata?.commit_hash;
  const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim();
  checkReleaseOrder(sha,head,(a,b)=>{try{execFileSync('git',['merge-base','--is-ancestor',a,b],{stdio:'ignore',windowsHide:true});return true;}catch{return false;}});
  console.log(`Release order verified: ${sha.slice(0,8)} -> ${head.slice(0,8)}`);
}
