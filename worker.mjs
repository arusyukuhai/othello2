import {search} from './search.mjs';
self.onmessage=({data})=>{try{let result=search(data.state,data.options,p=>self.postMessage({type:'progress',...p}));self.postMessage({type:'done',...result});}catch(e){self.postMessage({type:'error',message:e.message});}};
