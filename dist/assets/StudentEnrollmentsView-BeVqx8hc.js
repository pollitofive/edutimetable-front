import{d as Le,u as dt,J as $e,c as w,I as Ie,a9 as ut,i as m,o as i,m as rt,e,_ as it,t as ct,Y as mt,Z as j,r as p,$ as xe,a8 as _t,a0 as be,N as M,k as o,j as n,x as a,w as r,B as _,n as y,E as N,v as x,F as A,p as V,a as T,s as z,a1 as vt,a2 as O,a4 as pt,a5 as ft,a6 as gt,a7 as ht}from"./index-D2oXT1xy.js";import{_ as ie}from"./FormLabel.vue_vue_type_script_setup_true_lang-DPKPgNkB.js";import{_ as q}from"./FormSelect.vue_vue_type_script_setup_true_lang-B1PIZPoQ.js";import{T as v,P as F}from"./index-CBE7LNRt.js";const yt=["type"],xt={inheritAttrs:!1},bt=Le({...xt,__name:"FormTextarea",props:{value:{},modelValue:{},formTextareaSize:{},rounded:{type:Boolean}},emits:["update:modelValue"],setup(Q,{emit:l}){const I=Q,K=dt(),ce=$e("formInline",!1),se=$e("inputGroup",!1),me=w(()=>ct(["disabled:bg-slate-100 disabled:cursor-not-allowed dark:disabled:bg-darkmode-700/50","[&[readonly]]:bg-slate-100 [&[readonly]]:cursor-not-allowed [&[readonly]]:dark:bg-darkmode-700/50","transition duration-200 ease-in-out w-full text-sm border-slate-300/60 shadow-sm rounded-md placeholder:text-slate-400/90 focus:ring-4 focus:ring-primary focus:ring-opacity-20 focus:border-primary focus:border-opacity-40 dark:bg-darkmode-700 dark:focus:ring-slate-700 dark:focus:ring-opacity-50 dark:placeholder:text-slate-500/80",I.formTextareaSize=="sm"&&"text-xs py-1.5 px-2",I.formTextareaSize=="lg"&&"text-lg py-1.5 px-4",I.rounded&&"rounded-full",ce&&"flex-1",se&&"rounded-none [&:not(:first-child)]:border-l-transparent first:rounded-l last:rounded-r z-10",typeof K.class=="string"&&K.class])),_e=l,ae=w({get(){return I.modelValue===void 0?I.value:I.modelValue},set(Y){_e("update:modelValue",Y)}});return(Y,H)=>Ie((i(),m("textarea",rt({type:I.type,class:me.value},e(it).omit(e(K),"class"),{"onUpdate:modelValue":H[0]||(H[0]=W=>ae.value=W)}),null,16,yt)),[[ut,ae.value]])}}),U=Q=>(ft("data-v-7e8376de"),Q=Q(),gt(),Q),Et={class:"w-full"},kt={class:"flex flex-col gap-y-3 md:h-10 md:flex-row md:items-center"},Tt={class:"text-base font-medium"},wt={class:"flex flex-col gap-x-3 gap-y-2 sm:flex-row md:ml-auto"},St={class:"box box--stacked flex flex-col mt-5 w-full"},Ct={class:"p-5 border-b border-slate-200/60"},$t={class:"flex flex-col gap-4 sm:flex-row sm:items-center"},Lt={class:"flex-1"},It={value:""},Pt=["value"],Dt={class:"flex-1"},Nt={value:""},At=["value"],Ut={class:"flex-1"},Mt={value:""},Vt={value:"ACTIVE"},Ft={value:"COMPLETED"},Gt={value:"DROPPED"},Rt={value:"PENDING"},Bt={key:0,class:"flex items-center justify-center p-10"},jt={class:"flex flex-col items-center gap-3"},zt={class:"text-sm text-slate-500"},Ot={key:1,class:"flex items-center justify-center p-10"},qt={class:"flex flex-col items-center gap-3"},Qt={class:"text-sm text-slate-500"},Yt={key:2,class:"overflow-x-auto"},Ht={class:"flex flex-col items-center gap-3"},Jt={class:"text-xs text-slate-500"},Xt={class:"font-medium"},Zt={class:"text-xs text-slate-500"},Kt={class:"font-medium"},Wt={key:0,class:"text-xs text-slate-500"},es={class:"text-slate-600"},ts={class:"text-xs"},ss={class:"px-2 py-1 rounded-md bg-primary/10 text-primary inline-block mb-1"},as={class:"font-mono text-slate-600"},ls={class:"text-xs text-slate-600 max-w-xs truncate"},os={class:"flex items-center justify-center gap-2"},ns={key:3,class:"flex flex-col items-center gap-4 p-5 border-t sm:flex-row border-slate-200/60"},ds={class:"flex items-center gap-2"},us={class:"text-sm text-slate-600"},rs=U(()=>o("option",{value:10},"10",-1)),is=U(()=>o("option",{value:25},"25",-1)),cs=U(()=>o("option",{value:50},"50",-1)),ms=U(()=>o("option",{value:100},"100",-1)),_s=[rs,is,cs,ms],vs={class:"text-sm text-slate-600"},ps={class:"text-sm text-slate-600 sm:ml-auto"},fs={class:"mr-auto text-base font-medium"},gs={class:"col-span-12"},hs={value:""},ys=["value"],xs={key:0,class:"mt-1 text-xs text-danger"},bs={class:"col-span-12"},Es={key:0,class:"p-3 mb-2 rounded-md bg-slate-100 text-slate-600 text-sm"},ks={class:"flex items-center gap-2"},Ts=U(()=>o("span",null,"Loading student availabilities...",-1)),ws={key:1,class:"p-3 mb-2 rounded-md bg-blue-50 text-blue-700 text-sm"},Ss={class:"flex items-center gap-2"},Cs=U(()=>o("span",null,"Please select a student first to see available course groups",-1)),$s={key:2,class:"p-3 mb-2 rounded-md bg-yellow-50 text-yellow-700 text-sm"},Ls={class:"flex items-center gap-2"},Is=U(()=>o("span",null,"This student has no availability configured. No course groups available.",-1)),Ps={key:3,class:"p-3 mb-2 rounded-md bg-yellow-50 text-yellow-700 text-sm"},Ds={class:"flex items-center gap-2"},Ns=U(()=>o("span",null,"No course groups match this student's availability",-1)),As={value:""},Us=["value"],Ms={value:""},Vs=["value"],Fs={key:6,class:"mt-2 p-2 rounded-md bg-blue-50 text-blue-700 text-xs"},Gs={class:"flex items-start gap-2"},Rs={key:7,class:"mt-1 text-xs text-danger"},Bs={class:"col-span-12"},js=["value"],zs={key:0,class:"mt-1 text-xs text-danger"},Os={class:"col-span-12"},qs={key:1},Qs={class:"p-5 text-center"},Ys={class:"mt-5 text-3xl"},Hs={class:"mt-2 text-slate-500"},Js=U(()=>o("br",null,null,-1)),Xs={class:"px-5 pb-8 text-center"},Zs={key:1},Ks=Le({__name:"StudentEnrollmentsView",setup(Q){const{t:l}=mt(),I=j`
  query GetStudentEnrollments($first: Int!, $page: Int!, $student_id: ID, $schedule_id: ID, $status: StudentEnrollmentStatus) {
    studentEnrollments(first: $first, page: $page, student_id: $student_id, schedule_id: $schedule_id, status: $status) {
      data {
        id
        student_id
        schedule_id
        student {
          id
          name
          code
        }
        schedule {
          id
          course {
            id
            name
            level
            year
          }
          teacher {
            id
            name
          }
          day_of_week
          starts_at
          ends_at
          description
          group_id
        }
        enrolled_at
        status
        notes
        created_at
      }
      paginatorInfo {
        total
        count
        currentPage
        lastPage
        hasMorePages
        perPage
      }
    }
  }
`,K=j`
  query GetAllStudents {
    students(first: 10000) {
      data {
        id
        name
        code
      }
    }
  }
`,ce=j`
  query GetAllSchedules {
    schedules(first: 10000) {
      data {
        id
        course {
          id
          name
          level
          year
        }
        teacher {
          id
          name
        }
        day_of_week
        starts_at
        ends_at
        description
        group_id
      }
    }
  }
`,se=j`
  query GetStudentAvailabilities($student_id: ID!) {
    studentAvailabilities(student_id: $student_id) {
      data {
        id
        student_id
        day_of_week
        start_time
        end_time
      }
    }
  }
`,me=j`
  mutation CreateStudentEnrollment($input: CreateStudentEnrollmentInput!) {
    createStudentEnrollment(input: $input) {
      id
      student_id
      schedule_id
      student {
        id
        name
        code
      }
      schedule {
        id
        course {
          id
          name
        }
        teacher {
          id
          name
        }
        day_of_week
        starts_at
        ends_at
        description
      }
      enrolled_at
      status
      notes
    }
  }
`,_e=j`
  mutation UpdateStudentEnrollment($id: ID!, $input: UpdateStudentEnrollmentInput!) {
    updateStudentEnrollment(id: $id, input: $input) {
      id
      student_id
      schedule_id
      status
      notes
    }
  }
`,ae=j`
  mutation DeleteStudentEnrollment($id: ID!) {
    deleteStudentEnrollment(id: $id) {
      id
    }
  }
`,Y=p([]),H=p([]),W=p([]),G=p([]),le=p(!1),k=p(!1),oe=p(null),c=p({student_id:"",group_id:"",status:"active",notes:""}),f=p({}),ne=p(!1),R=p(null),ve=p(!1),Ee=p(""),ke=p("success"),g=p(1),S=p(10),J=p(0),pe=p(1),C=p(""),$=p(""),L=p(""),{result:Pe,loading:Te,error:we,refetch:de}=xe(I,()=>({first:S.value,page:g.value,student_id:C.value||void 0,schedule_id:$.value||void 0,status:L.value||void 0}),{fetchPolicy:"cache-and-network"}),{result:De}=xe(K),{result:Ne}=xe(ce),{result:Se,loading:ue,load:Ae,refetch:Ue}=_t(se,null,{fetchPolicy:"cache-and-network"}),{mutate:Me,loading:Ve}=be(me),{mutate:Fe,loading:Ge}=be(_e),{mutate:Re,loading:fe}=be(ae),ge=w(()=>Ve.value||Ge.value),Be=w(()=>k.value?l("studentEnrollments.form.editTitle"):l("studentEnrollments.form.addTitle")),je=w(()=>J.value===0?0:(g.value-1)*S.value+1),ze=w(()=>{const s=g.value*S.value;return s>J.value?J.value:s}),P=w(()=>pe.value),he=s=>[l("studentEnrollments.days.sunday"),l("studentEnrollments.days.monday"),l("studentEnrollments.days.tuesday"),l("studentEnrollments.days.wednesday"),l("studentEnrollments.days.thursday"),l("studentEnrollments.days.friday"),l("studentEnrollments.days.saturday")][s]||"",Oe=s=>({active:"bg-success/10 text-success",completed:"bg-primary/10 text-primary",dropped:"bg-danger/10 text-danger",pending:"bg-warning/10 text-warning"})[s]||"bg-slate-100 text-slate-600",qe=s=>l(`studentEnrollments.status.${s.toLowerCase()}`),Qe=w(()=>[{value:"active",label:l("studentEnrollments.status.active")},{value:"completed",label:l("studentEnrollments.status.completed")},{value:"dropped",label:l("studentEnrollments.status.dropped")},{value:"pending",label:l("studentEnrollments.status.pending")}]);M(Pe,s=>{var d,t;if((d=s==null?void 0:s.studentEnrollments)!=null&&d.data&&(Y.value=s.studentEnrollments.data),(t=s==null?void 0:s.studentEnrollments)!=null&&t.paginatorInfo){const u=s.studentEnrollments.paginatorInfo;J.value=u.total,pe.value=u.lastPage,g.value=u.currentPage}}),M(De,s=>{var d;(d=s==null?void 0:s.students)!=null&&d.data&&(H.value=[...s.students.data].sort((t,u)=>t.name.localeCompare(u.name)))},{immediate:!0}),M(Ne,s=>{var d;(d=s==null?void 0:s.schedules)!=null&&d.data&&(W.value=[...s.schedules.data].sort((t,u)=>t.course.name.localeCompare(u.course.name)))},{immediate:!0}),M(Se,s=>{var d;(d=s==null?void 0:s.studentAvailabilities)!=null&&d.data&&(G.value=s.studentAvailabilities.data)},{immediate:!0}),M(()=>c.value.student_id,s=>{k.value||(c.value.group_id=""),s&&!k.value?(G.value=[],(Se.value?Ue({student_id:s}):Ae(se,{student_id:s})).catch(t=>{console.error("Error fetching availabilities:",t)})):k.value||(G.value=[])});const D=(s,d="success")=>{Ee.value=s,ke.value=d,ve.value=!0},Ye=()=>{ve.value=!1},He=()=>(f.value={},c.value.student_id||(f.value.student_id=l("studentEnrollments.validation.studentRequired")),c.value.group_id||(f.value.group_id=l("studentEnrollments.validation.scheduleRequired")),c.value.status||(f.value.status=l("studentEnrollments.validation.statusRequired")),Object.keys(f.value).length===0),Je=()=>{k.value=!1,oe.value=null,c.value={student_id:"",group_id:"",status:"active",notes:""},f.value={},le.value=!0},Xe=s=>{k.value=!0,oe.value=s.id;const d=s.status.toLowerCase();c.value={student_id:s.student_id,group_id:s.schedule.group_id||s.schedule_id,status:d,notes:s.notes||""},f.value={},le.value=!0},ye=()=>{le.value=!1,k.value=!1,oe.value=null,c.value={student_id:"",group_id:"",status:"active",notes:""},f.value={}},Ze=async()=>{var d,t;if(!He())return;if(!localStorage.getItem("token")){D("You are not logged in. Please login first.","error");return}try{if(k.value)await Fe({id:oe.value,input:{status:c.value.status.toUpperCase(),notes:c.value.notes||void 0}}),D(l("studentEnrollments.messages.updateSuccess"),"success");else{const u=Z.value.find(h=>h.group_id===c.value.group_id);if(!u||u.schedules.length===0){D("Invalid group selection","error");return}const b=u.schedules.map(h=>{const te={student_id:c.value.student_id,schedule_id:h.id,status:c.value.status.toUpperCase(),notes:c.value.notes||void 0};return Me({input:te})});await Promise.all(b);const E=u.schedules.length;D(`Successfully enrolled in ${E} schedule${E>1?"s":""}`,"success")}ye(),X()}catch(u){if(u.graphQLErrors&&u.graphQLErrors.length>0){const E=u.graphQLErrors[0];if(((d=E.extensions)==null?void 0:d.category)==="validation"){const h=(t=E.extensions)==null?void 0:t.validation,te=Object.values(h).flat().join(", ");D(`Validation Error: ${te}`,"error");return}if(E.message){D(E.message,"error");return}}const b=u.message||l("studentEnrollments.messages.generalError");D(b,"error")}},Ke=s=>{R.value=s,ne.value=!0},We=async()=>{if(R.value)try{await Re({id:R.value.id}),D(l("studentEnrollments.messages.deleteSuccess"),"success"),ne.value=!1,R.value=null,X()}catch(s){const d=s.message||l("studentEnrollments.messages.deleteError");D(d,"error")}},Ce=()=>{ne.value=!1,R.value=null},ee=s=>{s>=1&&s<=pe.value&&(g.value=s,de({first:S.value,page:s,student_id:C.value||void 0,schedule_id:$.value||void 0,status:L.value||void 0}))},et=s=>{S.value=s,g.value=1,de({first:s,page:1,student_id:C.value||void 0,schedule_id:$.value||void 0,status:L.value||void 0})},X=()=>{g.value=1,de({first:S.value,page:1,student_id:C.value||void 0,schedule_id:$.value||void 0,status:L.value||void 0})},tt=()=>{C.value="",$.value="",L.value="",X()},st=w(()=>C.value!==""||$.value!==""||L.value!=="");M(C,()=>{X()}),M($,()=>{X()}),M(L,()=>{X()});const at=(s,d)=>d.length===0?!1:d.some(t=>{if(t.day_of_week!==s.day_of_week)return!1;const u=s.starts_at.substring(0,5),b=s.ends_at.substring(0,5),E=t.start_time.length===5?t.start_time:t.start_time.substring(0,5),h=t.end_time.length===5?t.end_time:t.end_time.substring(0,5);return u>=E&&b<=h}),lt=w(()=>c.value.student_id?G.value.length===0?[]:W.value.filter(s=>at(s,G.value)):[]),Z=w(()=>{const s=lt.value,d=new Map;s.forEach(u=>{const b=u.group_id||u.id;d.has(b)||d.set(b,[]),d.get(b).push(u)});const t=[];return d.forEach((u,b)=>{const E=[...u].sort((B,re)=>B.day_of_week!==re.day_of_week?B.day_of_week-re.day_of_week:B.starts_at.localeCompare(re.starts_at)),h=E[0],te=E.map(B=>`${he(B.day_of_week).substring(0,3)} ${B.starts_at.substring(0,5)}-${B.ends_at.substring(0,5)}`),nt=`${h.course.name} - ${h.description} (${h.teacher.name}) - ${te.join(", ")}`;t.push({group_id:b,course:h.course,teacher:h.teacher,description:h.description,schedules:E,displayText:nt})}),t.sort((u,b)=>u.course.name.localeCompare(b.course.name))}),ot=s=>{const d=he(s.day_of_week);return`${s.course.name} - ${s.teacher.name} (${d} ${s.starts_at}-${s.ends_at})`};return(s,d)=>(i(),m("div",Et,[o("div",kt,[o("div",Tt,a(e(l)("studentEnrollments.title")),1),o("div",wt,[n(e(N),{variant:"primary",onClick:Je},{default:r(()=>[n(e(y),{icon:"Plus",class:"w-4 h-4 mr-2"}),_(" "+a(e(l)("studentEnrollments.actions.new")),1)]),_:1})])]),o("div",St,[o("div",Ct,[o("div",$t,[o("div",Lt,[n(e(q),{modelValue:C.value,"onUpdate:modelValue":d[0]||(d[0]=t=>C.value=t)},{default:r(()=>[o("option",It,a(e(l)("studentEnrollments.filters.allStudents")),1),(i(!0),m(A,null,V(H.value,t=>(i(),m("option",{key:t.id,value:t.id},a(t.name)+" ("+a(t.code)+") ",9,Pt))),128))]),_:1},8,["modelValue"])]),o("div",Dt,[n(e(q),{modelValue:$.value,"onUpdate:modelValue":d[1]||(d[1]=t=>$.value=t)},{default:r(()=>[o("option",Nt,a(e(l)("studentEnrollments.filters.allSchedules")),1),(i(!0),m(A,null,V(W.value,t=>(i(),m("option",{key:t.id,value:t.id},a(ot(t)),9,At))),128))]),_:1},8,["modelValue"])]),o("div",Ut,[n(e(q),{modelValue:L.value,"onUpdate:modelValue":d[2]||(d[2]=t=>L.value=t)},{default:r(()=>[o("option",Mt,a(e(l)("studentEnrollments.filters.allStatuses")),1),o("option",Vt,a(e(l)("studentEnrollments.status.active")),1),o("option",Ft,a(e(l)("studentEnrollments.status.completed")),1),o("option",Gt,a(e(l)("studentEnrollments.status.dropped")),1),o("option",Rt,a(e(l)("studentEnrollments.status.pending")),1)]),_:1},8,["modelValue"])]),o("div",null,[st.value?(i(),T(e(N),{key:0,variant:"outline-secondary",onClick:tt,class:"w-full sm:w-auto"},{default:r(()=>[n(e(y),{icon:"X",class:"w-4 h-4 mr-2"}),_(" "+a(e(l)("studentEnrollments.actions.clearFilters")),1)]),_:1})):x("",!0)])])]),e(Te)?(i(),m("div",Bt,[o("div",jt,[n(e(y),{icon:"Loader",class:"w-8 h-8 animate-spin text-primary"}),o("div",zt,a(e(l)("studentEnrollments.messages.loading")),1)])])):e(we)?(i(),m("div",Ot,[o("div",qt,[n(e(y),{icon:"AlertCircle",class:"w-8 h-8 text-danger"}),o("div",Qt,a(e(l)("studentEnrollments.messages.error")),1),n(e(N),{variant:"outline-primary",onClick:d[3]||(d[3]=()=>e(de)({first:S.value,page:g.value,student_id:C.value||void 0,schedule_id:$.value||void 0,status:L.value||void 0}))},{default:r(()=>[_(a(e(l)("studentEnrollments.actions.retry")),1)]),_:1})])])):(i(),m("div",Yt,[n(e(v),{class:"border-b border-slate-200/60"},{default:r(()=>[n(e(v).Thead,null,{default:r(()=>[n(e(v).Tr,null,{default:r(()=>[n(e(v).Td,{class:"py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap"},{default:r(()=>[_(a(e(l)("studentEnrollments.columns.id")),1)]),_:1}),n(e(v).Td,{class:"py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap"},{default:r(()=>[_(a(e(l)("studentEnrollments.columns.student")),1)]),_:1}),n(e(v).Td,{class:"py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap"},{default:r(()=>[_(a(e(l)("studentEnrollments.columns.course")),1)]),_:1}),n(e(v).Td,{class:"py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap"},{default:r(()=>[_(a(e(l)("studentEnrollments.columns.teacher")),1)]),_:1}),n(e(v).Td,{class:"py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap"},{default:r(()=>[_(a(e(l)("studentEnrollments.columns.schedule")),1)]),_:1}),n(e(v).Td,{class:"py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap"},{default:r(()=>[_(a(e(l)("studentEnrollments.columns.status")),1)]),_:1}),n(e(v).Td,{class:"py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap"},{default:r(()=>[_(a(e(l)("studentEnrollments.columns.notes")),1)]),_:1}),n(e(v).Td,{class:"py-4 font-medium text-center bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap"},{default:r(()=>[_(a(e(l)("studentEnrollments.columns.actions")),1)]),_:1})]),_:1})]),_:1}),n(e(v).Tbody,null,{default:r(()=>[Y.value.length===0?(i(),T(e(v).Tr,{key:0},{default:r(()=>[n(e(v).Td,{colspan:"8",class:"py-10 text-center text-slate-500"},{default:r(()=>[o("div",Ht,[n(e(y),{icon:"Inbox",class:"w-10 h-10 text-slate-300"}),o("div",null,a(e(l)("studentEnrollments.messages.noEnrollments")),1)])]),_:1})]),_:1})):x("",!0),(i(!0),m(A,null,V(Y.value,t=>(i(),T(e(v).Tr,{key:t.id,class:"[&_td]:last:border-b-0"},{default:r(()=>[n(e(v).Td,{class:"py-4 border-dashed dark:bg-darkmode-600"},{default:r(()=>[o("div",Jt,"#"+a(t.id),1)]),_:2},1024),n(e(v).Td,{class:"py-4 border-dashed dark:bg-darkmode-600"},{default:r(()=>[o("div",Xt,a(t.student.name),1),o("div",Zt,a(t.student.code),1)]),_:2},1024),n(e(v).Td,{class:"py-4 border-dashed dark:bg-darkmode-600"},{default:r(()=>[o("div",Kt,a(t.schedule.course.name),1),t.schedule.course.level?(i(),m("div",Wt,a(t.schedule.course.level),1)):x("",!0)]),_:2},1024),n(e(v).Td,{class:"py-4 border-dashed dark:bg-darkmode-600"},{default:r(()=>[o("div",es,a(t.schedule.teacher.name),1)]),_:2},1024),n(e(v).Td,{class:"py-4 border-dashed dark:bg-darkmode-600"},{default:r(()=>[o("div",ts,[o("div",ss,a(he(t.schedule.day_of_week)),1),o("div",as,a(t.schedule.starts_at)+" - "+a(t.schedule.ends_at),1)])]),_:2},1024),n(e(v).Td,{class:"py-4 border-dashed dark:bg-darkmode-600"},{default:r(()=>[o("span",{class:z(["px-2 py-1 text-xs font-medium rounded-md",Oe(t.status)])},a(qe(t.status)),3)]),_:2},1024),n(e(v).Td,{class:"py-4 border-dashed dark:bg-darkmode-600"},{default:r(()=>[o("div",ls,a(t.notes||"-"),1)]),_:2},1024),n(e(v).Td,{class:"relative py-4 border-dashed dark:bg-darkmode-600"},{default:r(()=>[o("div",os,[n(e(N),{variant:"outline-primary",size:"sm",onClick:u=>Xe(t),class:"w-16"},{default:r(()=>[n(e(y),{icon:"Pencil",class:"w-3.5 h-3.5 mr-1"}),_(" "+a(e(l)("studentEnrollments.actions.edit")),1)]),_:2},1032,["onClick"]),n(e(N),{variant:"outline-danger",size:"sm",onClick:u=>Ke(t),class:"w-20"},{default:r(()=>[n(e(y),{icon:"Trash2",class:"w-3.5 h-3.5 mr-1"}),_(" "+a(e(l)("studentEnrollments.actions.delete")),1)]),_:2},1032,["onClick"])])]),_:2},1024)]),_:2},1024))),128))]),_:1})]),_:1})])),!e(Te)&&!e(we)&&J.value>0?(i(),m("div",ns,[o("div",ds,[o("span",us,a(e(l)("studentEnrollments.pagination.show")),1),Ie(o("select",{"onUpdate:modelValue":d[4]||(d[4]=t=>S.value=t),onChange:d[5]||(d[5]=t=>et(S.value)),class:"px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-darkmode-400 dark:bg-darkmode-800 focus:ring-2 focus:ring-primary focus:border-primary"},_s,544),[[vt,S.value,void 0,{number:!0}]]),o("span",vs,a(e(l)("studentEnrollments.pagination.entries")),1)]),o("div",ps,a(e(l)("studentEnrollments.pagination.showingInfo",{start:je.value,end:ze.value,total:J.value})),1),n(e(F),{class:"flex-1 sm:flex-initial"},{default:r(()=>[n(e(F).Link,{onClick:d[6]||(d[6]=t=>ee(g.value-1)),class:z({"cursor-not-allowed opacity-50":g.value===1})},{default:r(()=>[n(e(y),{icon:"ChevronLeft",class:"w-4 h-4"})]),_:1},8,["class"]),P.value>0?(i(),T(e(F).Link,{key:0,active:g.value===1,onClick:d[7]||(d[7]=t=>ee(1))},{default:r(()=>[_(" 1 ")]),_:1},8,["active"])):x("",!0),g.value>3?(i(),T(e(F).Link,{key:1,disabled:""},{default:r(()=>[_(" ... ")]),_:1})):x("",!0),(i(!0),m(A,null,V(P.value,t=>(i(),m(A,{key:t},[t>1&&t<P.value&&Math.abs(t-g.value)<=1?(i(),T(e(F).Link,{key:0,active:g.value===t,onClick:u=>ee(t)},{default:r(()=>[_(a(t),1)]),_:2},1032,["active","onClick"])):x("",!0)],64))),128)),g.value<P.value-2?(i(),T(e(F).Link,{key:2,disabled:""},{default:r(()=>[_(" ... ")]),_:1})):x("",!0),P.value>1?(i(),T(e(F).Link,{key:3,active:g.value===P.value,onClick:d[8]||(d[8]=t=>ee(P.value))},{default:r(()=>[_(a(P.value),1)]),_:1},8,["active"])):x("",!0),n(e(F).Link,{onClick:d[9]||(d[9]=t=>ee(g.value+1)),class:z({"cursor-not-allowed opacity-50":g.value===P.value})},{default:r(()=>[n(e(y),{icon:"ChevronRight",class:"w-4 h-4"})]),_:1},8,["class"])]),_:1})])):x("",!0)]),n(e(O),{open:le.value,onClose:ye,staticBackdrop:!0},{default:r(()=>[n(e(O).Panel,{class:"max-w-2xl"},{default:r(()=>[n(e(O).Title,null,{default:r(()=>[o("h2",fs,a(Be.value),1)]),_:1}),n(e(O).Description,{class:"grid grid-cols-12 gap-4 gap-y-3"},{default:r(()=>{var t;return[o("div",gs,[n(e(ie),{htmlFor:"enrollment-student"},{default:r(()=>[_(a(e(l)("studentEnrollments.form.student"))+" *",1)]),_:1}),n(e(q),{id:"enrollment-student",modelValue:c.value.student_id,"onUpdate:modelValue":d[10]||(d[10]=u=>c.value.student_id=u),disabled:k.value,class:z({"border-danger":f.value.student_id})},{default:r(()=>[o("option",hs,a(e(l)("studentEnrollments.form.selectStudent")),1),(i(!0),m(A,null,V(H.value,u=>(i(),m("option",{key:u.id,value:u.id},a(u.name)+" ("+a(u.code)+") ",9,ys))),128))]),_:1},8,["modelValue","disabled","class"]),f.value.student_id?(i(),m("div",xs,a(f.value.student_id),1)):x("",!0)]),o("div",bs,[n(e(ie),{htmlFor:"enrollment-group"},{default:r(()=>[_(a(e(l)("studentEnrollments.form.schedule"))+" *",1)]),_:1}),c.value.student_id&&e(ue)?(i(),m("div",Es,[o("div",ks,[n(e(y),{icon:"Loader",class:"w-4 h-4 animate-spin"}),Ts])])):x("",!0),!c.value.student_id&&!k.value?(i(),m("div",ws,[o("div",Ss,[n(e(y),{icon:"Info",class:"w-4 h-4"}),Cs])])):x("",!0),c.value.student_id&&!e(ue)&&G.value.length===0&&!k.value?(i(),m("div",$s,[o("div",Ls,[n(e(y),{icon:"AlertCircle",class:"w-4 h-4"}),Is])])):x("",!0),c.value.student_id&&!e(ue)&&G.value.length>0&&Z.value.length===0&&!k.value?(i(),m("div",Ps,[o("div",Ds,[n(e(y),{icon:"AlertCircle",class:"w-4 h-4"}),Ns])])):x("",!0),k.value?(i(),T(e(q),{key:5,id:"enrollment-group",modelValue:c.value.group_id,"onUpdate:modelValue":d[12]||(d[12]=u=>c.value.group_id=u),disabled:!0,class:z({"border-danger":f.value.group_id})},{default:r(()=>[o("option",Ms,a(e(l)("studentEnrollments.form.selectSchedule")),1),(i(!0),m(A,null,V(Z.value,u=>(i(),m("option",{key:u.group_id,value:u.group_id},a(u.displayText),9,Vs))),128))]),_:1},8,["modelValue","class"])):(i(),T(e(q),{key:4,id:"enrollment-group",modelValue:c.value.group_id,"onUpdate:modelValue":d[11]||(d[11]=u=>c.value.group_id=u),disabled:!c.value.student_id||e(ue)||Z.value.length===0,class:z({"border-danger":f.value.group_id})},{default:r(()=>[o("option",As,a(e(l)("studentEnrollments.form.selectSchedule")),1),(i(!0),m(A,null,V(Z.value,u=>(i(),m("option",{key:u.group_id,value:u.group_id},a(u.displayText),9,Us))),128))]),_:1},8,["modelValue","disabled","class"])),!k.value&&c.value.group_id?(i(),m("div",Fs,[o("div",Gs,[n(e(y),{icon:"Info",class:"w-4 h-4 mt-0.5 flex-shrink-0"}),o("span",null,"Note: The student will be enrolled in ALL schedule slots in this group ("+a(((t=Z.value.find(u=>u.group_id===c.value.group_id))==null?void 0:t.schedules.length)||0)+" slots)",1)])])):x("",!0),f.value.group_id?(i(),m("div",Rs,a(f.value.group_id),1)):x("",!0)]),o("div",Bs,[n(e(ie),{htmlFor:"enrollment-status"},{default:r(()=>[_(a(e(l)("studentEnrollments.form.status"))+" *",1)]),_:1}),n(e(q),{id:"enrollment-status",modelValue:c.value.status,"onUpdate:modelValue":d[13]||(d[13]=u=>c.value.status=u),class:z({"border-danger":f.value.status})},{default:r(()=>[(i(!0),m(A,null,V(Qe.value,u=>(i(),m("option",{key:u.value,value:u.value},a(u.label),9,js))),128))]),_:1},8,["modelValue","class"]),f.value.status?(i(),m("div",zs,a(f.value.status),1)):x("",!0)]),o("div",Os,[n(e(ie),{htmlFor:"enrollment-notes"},{default:r(()=>[_(a(e(l)("studentEnrollments.form.notes")),1)]),_:1}),n(e(bt),{id:"enrollment-notes",modelValue:c.value.notes,"onUpdate:modelValue":d[14]||(d[14]=u=>c.value.notes=u),rows:"3",placeholder:e(l)("studentEnrollments.form.notesPlaceholder")},null,8,["modelValue","placeholder"])])]}),_:1}),n(e(O).Footer,{class:"text-right"},{default:r(()=>[n(e(N),{type:"button",variant:"outline-secondary",onClick:ye,disabled:ge.value,class:"w-20 mr-2"},{default:r(()=>[_(a(e(l)("studentEnrollments.actions.cancel")),1)]),_:1},8,["disabled"]),n(e(N),{type:"button",variant:"primary",onClick:Ze,disabled:ge.value,class:"w-32"},{default:r(()=>[ge.value?(i(),T(e(y),{key:0,icon:"Loader",class:"w-4 h-4 animate-spin"})):(i(),m("span",qs,a(k.value?e(l)("studentEnrollments.actions.update"):e(l)("studentEnrollments.actions.create")),1))]),_:1},8,["disabled"])]),_:1})]),_:1})]),_:1},8,["open"]),n(e(O),{open:ne.value,onClose:Ce,staticBackdrop:!0},{default:r(()=>[n(e(O).Panel,null,{default:r(()=>{var t,u,b,E,h;return[o("div",Qs,[n(e(y),{icon:"AlertTriangle",class:"w-16 h-16 mx-auto mt-3 text-danger"}),o("div",Ys,a(e(l)("studentEnrollments.delete.title")),1),o("div",Hs,[_(a(e(l)("studentEnrollments.delete.message",{student:((u=(t=R.value)==null?void 0:t.student)==null?void 0:u.name)||"",course:((h=(E=(b=R.value)==null?void 0:b.schedule)==null?void 0:E.course)==null?void 0:h.name)||""}))+" ",1),Js,_(" "+a(e(l)("studentEnrollments.delete.cannotUndo")),1)])]),o("div",Xs,[n(e(N),{type:"button",variant:"outline-secondary",onClick:Ce,disabled:e(fe),class:"w-24 mr-2"},{default:r(()=>[_(a(e(l)("studentEnrollments.delete.cancel")),1)]),_:1},8,["disabled"]),n(e(N),{type:"button",variant:"danger",onClick:We,disabled:e(fe),class:"w-24"},{default:r(()=>[e(fe)?(i(),T(e(y),{key:0,icon:"Loader",class:"w-4 h-4 animate-spin"})):(i(),m("span",Zs,a(e(l)("studentEnrollments.delete.confirm")),1))]),_:1},8,["disabled"])])]}),_:1})]),_:1},8,["open"]),n(pt,{show:ve.value,message:Ee.value,type:ke.value,onClose:Ye},null,8,["show","message","type"])]))}}),aa=ht(Ks,[["__scopeId","data-v-7e8376de"]]);export{aa as default};
