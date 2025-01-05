import{M as $}from"./leancloud-service-D8PKWX6z.js";import{S as O}from"./SearchOutline-D1q6xqfW.js";import{z as h}from"./zhCN-61bU8iQO.js";import{d as Y,m as G,R as H,g as u,n as z,h as J,i as K,c as W,e as n,w as r,F as X,r as D,o as Z,f as U,u as s,q,s as ee,k as ae,x as y,B as M,L as N,_ as te}from"./index-DXhrB1zA.js";import{C as le}from"./CreateOutline-C305c4EG.js";const ne=Y({__name:"Schedule",setup(ie){const b=G(),F=H(),c=u(!1),j=async()=>{try{return c.value=!0,(await $.getAllMembers()).map(e=>({...e,id:e.objectId,lastTrainingDate:e.lastTrainingDate==="null"?"":e.lastTrainingDate||"",passDate:e.passDate||""}))}catch(a){return console.error("Failed to load data:",a),b.error("加载数据失败"),[]}finally{c.value=!1}},f=u([]),S=u(""),m=u(null),p=u(null),v=u(null),x=z(()=>{let a=f.value;if(S.value){const e=S.value.toLowerCase();a=a.filter(o=>o.nickname.toLowerCase().includes(e)||o.qq.toLowerCase().includes(e))}if(m.value&&m.value[0]&&m.value[1]){const e=new Date(m.value[0]).getTime(),o=new Date(m.value[1]).getTime();a=a.filter(l=>{const t=new Date(l.joinTime).getTime();return t>=e&&t<=o})}if(p.value&&p.value[0]&&p.value[1]){const e=new Date(p.value[0]).getTime(),o=new Date(p.value[1]).getTime();a=a.filter(l=>{if(!l.lastTrainingDate)return!1;const t=new Date(l.lastTrainingDate).getTime();return t>=e&&t<=o})}if(v.value&&v.value[0]&&v.value[1]){const e=new Date(v.value[0]).getTime(),o=new Date(v.value[1]).getTime();a=a.filter(l=>{if(!l.passDate)return!1;const t=new Date(l.passDate).getTime();return t>=e&&t<=o})}return a}),T=u({page:1,pageSize:10,itemCount:z(()=>x.value.length),showSizePicker:!0,pageSizes:[10,20,30,40,50,100],prefix:({itemCount:a})=>`共 ${a} 条数据`,suffix:({page:a,pageSize:e,pageCount:o})=>`第 ${a} 页 / 共 ${o} 页`}),w=u(!1),P=u(null),_=u(null),d=u({joinTime:null,lastTrainingDate:null}),I={joinTime:{required:!0,type:"number",message:"请选择加入时间",trigger:["blur","change"]},lastTrainingDate:{required:!1,type:"number",trigger:["blur","change"]}},B=a=>{_.value=a.id,d.value={joinTime:a.joinTime?new Date(a.joinTime).getTime():null,lastTrainingDate:a.lastTrainingDate?new Date(a.lastTrainingDate).getTime():null},w.value=!0},R=async a=>{var e;a.preventDefault(),(e=P.value)==null||e.validate(async o=>{if(!o)try{c.value=!0;const l={};if(d.value.joinTime){const t=new Date(d.value.joinTime);l.joinTime=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`}if(d.value.lastTrainingDate){const t=new Date(d.value.lastTrainingDate);l.lastTrainingDate=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;const g=f.value.find(k=>k.id===_.value);g&&g.stage==="未新训"&&await F.warning({title:"提示",content:"成员处于未新训状态，将默认修改为新训初期。",positiveText:"知道了"})&&(l.stage="新训初期",l.status="正常")}else{l.lastTrainingDate="";const t=f.value.find(g=>g.id===_.value);t&&t.stage==="新训初期"&&await F.warning({title:"提示",content:"清空新训日期可能影响成员阶段，此成员将恢复为未新训状态。",positiveText:"知道了"})&&(l.stage="未新训")}console.log("提交的数据:",l),await $.updateMember(_.value,l),f.value=await j(),b.success("更新成功"),w.value=!1}catch(l){console.error("Failed to update member:",l),b.error("更新失败")}finally{c.value=!1}})},L=[{title:"昵称",key:"nickname",width:130,sorter:"default"},{title:"QQ号",key:"qq",width:130,sorter:(a,e)=>Number(a.qq)-Number(e.qq)},{title:"加入时间",key:"joinTime",width:130,sorter:(a,e)=>new Date(a.joinTime).getTime()-new Date(e.joinTime).getTime()},{title:"最后一次新训日期",key:"lastTrainingDate",width:150,render(a){return a.lastTrainingDate||""},sorter:(a,e)=>!a.lastTrainingDate&&!e.lastTrainingDate?0:a.lastTrainingDate?e.lastTrainingDate?new Date(a.lastTrainingDate).getTime()-new Date(e.lastTrainingDate).getTime():1:-1},{title:"考核通过日期",key:"passDate",width:130,sorter:(a,e)=>!a.passDate&&!e.passDate?0:a.passDate?e.passDate?new Date(a.passDate).getTime()-new Date(e.passDate).getTime():1:-1},{title:"操作",key:"actions",width:80,render(a){return N(M,{quaternary:!0,circle:!0,size:"small",style:"color: #7B1FA2",onClick:()=>B(a)},{icon:()=>N(le)})}}],A=a=>{T.value.page=a},Q=a=>{T.value.pageSize=a;const e=Math.ceil(x.value.length/a);T.value.page>e&&(T.value.page=e)};let C=null;const V=()=>{C=window.setInterval(async()=>{f.value=await j()},6e4)};return J(async()=>{try{c.value=!0,f.value=await j()}catch(a){console.error("Failed to load initial data:",a),b.error("初始数据加载失败")}finally{c.value=!1}V()}),K(()=>{C&&clearInterval(C)}),(a,e)=>{const o=D("n-h2"),l=D("n-data-table"),t=D("n-card"),g=D("n-form-item"),k=D("n-form"),E=D("n-modal");return Z(),W(X,null,[n(t,null,{header:r(()=>[n(o,{style:{margin:"0",color:"#7B1FA2"}},{default:r(()=>e[8]||(e[8]=[U("日期总表")])),_:1})]),default:r(()=>[n(s(q),{vertical:""},{default:r(()=>[n(s(q),null,{default:r(()=>[n(s(ee),{value:S.value,"onUpdate:value":e[0]||(e[0]=i=>S.value=i),placeholder:"搜索昵称/QQ号",clearable:"",style:{width:"200px"}},{prefix:r(()=>[n(s(ae),null,{default:r(()=>[n(s(O))]),_:1})]),_:1},8,["value"]),n(s(y),{value:m.value,"onUpdate:value":e[1]||(e[1]=i=>m.value=i),type:"daterange",clearable:"",locale:s(h).DatePicker,placeholder:"加入时间范围",style:{width:"250px"}},null,8,["value","locale"]),n(s(y),{value:p.value,"onUpdate:value":e[2]||(e[2]=i=>p.value=i),type:"daterange",clearable:"",locale:s(h).DatePicker,placeholder:"最后一次新训日期范围",style:{width:"250px"}},null,8,["value","locale"]),n(s(y),{value:v.value,"onUpdate:value":e[3]||(e[3]=i=>v.value=i),type:"daterange",clearable:"",locale:s(h).DatePicker,placeholder:"考核通过日期范围",style:{width:"250px"}},null,8,["value","locale"])]),_:1}),n(l,{columns:L,data:x.value,pagination:T.value,loading:c.value,"onUpdate:page":A,"onUpdate:pageSize":Q},null,8,["data","pagination","loading"])]),_:1})]),_:1}),n(E,{show:w.value,"onUpdate:show":e[7]||(e[7]=i=>w.value=i),preset:"card",title:"编辑日期",style:{width:"500px"}},{footer:r(()=>[n(s(q),{justify:"end"},{default:r(()=>[n(s(M),{onClick:e[6]||(e[6]=i=>w.value=!1)},{default:r(()=>e[9]||(e[9]=[U("取消")])),_:1}),n(s(M),{type:"primary",class:"submit-button",onClick:R},{default:r(()=>e[10]||(e[10]=[U(" 保存 ")])),_:1})]),_:1})]),default:r(()=>[n(k,{ref_key:"formRef",ref:P,model:d.value,rules:I,"label-placement":"left","label-width":"120","require-mark-placement":"right-hanging"},{default:r(()=>[n(g,{label:"加入时间",path:"joinTime"},{default:r(()=>[n(s(y),{value:d.value.joinTime,"onUpdate:value":e[4]||(e[4]=i=>d.value.joinTime=i),type:"date",clearable:"",locale:s(h).DatePicker,"is-date-disabled":i=>i>Date.now(),style:{width:"100%"}},null,8,["value","locale","is-date-disabled"])]),_:1}),n(g,{label:"最后一次新训日期",path:"lastTrainingDate"},{default:r(()=>[n(s(y),{value:d.value.lastTrainingDate,"onUpdate:value":e[5]||(e[5]=i=>d.value.lastTrainingDate=i),type:"date",clearable:"",locale:s(h).DatePicker,"is-date-disabled":i=>i>Date.now(),style:{width:"100%"}},null,8,["value","locale","is-date-disabled"])]),_:1})]),_:1},8,["model"])]),_:1},8,["show"])],64)}}}),ge=te(ne,[["__scopeId","data-v-5cd4f045"]]);export{ge as default};
