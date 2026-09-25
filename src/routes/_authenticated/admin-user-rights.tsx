import { createFileRoute, redirect } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell, NAV } from "@/components/AppShell";
import { SectionCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route=createFileRoute("/_authenticated/admin-user-rights")({component:UserRightsPage,beforeLoad:async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user)throw redirect({to:"/auth"});const {data}=await supabase.from("user_roles").select("role").eq("user_id",user.id).eq("role","admin").maybeSingle();if(!data)throw redirect({to:"/dashboard"});}});

type Profile={id:string;full_name:string|null;email:string|null};
type Perm={user_id:string;tab_key:string;can_view:boolean;can_create:boolean;can_edit:boolean};
type NavItem={to:string;label:string;icon:any;group?:readonly {to:string;label:string;icon:any;tab?:string}[]};

const REPORTS=[["attendance","Staff attendance"],["salary","Salary Report"],["document","Document Report"],["mc_repository","MC Repository Report"],["election_commission","Election Commission Report"],["gate","Gate entry / exit"],["guest","Guests & visitors"],["vehicle","Vehicles"],["resident","Residents"],["occupancy","Flat occupancy"],["helpdesk","Help desk / WhatsApp"],["fm_checklist","FM Checklist Report"],["mc_checklist","MC Checklist Report"]] as const;

const MODULES=(()=>{const out:{key:string;label:string;level:"main"|"sub"}[]=[];for(const item of NAV as readonly NavItem[]){out.push({key:item.to,label:item.label,level:"main"});for(const child of item.group??[])out.push({key:child.tab?item.to+":"+child.tab:child.to,label:child.label,level:"sub"});}out.push({key:"/reports",label:"Reports",level:"main"}); for(const [key,label] of REPORTS) out.push({key:`/reports:${key}`,label,level:"sub"}); out.push({key:"/admin",label:"Admin",level:"main"});for(const x of ["/admin-settings","/user-management","/audit-log","/admin-user-rights","/integration-master","/mc-repository","/ec-repository","/bye-law-repository","/mc-handbook"])out.push({key:x,label:x.split("/").pop()?.replaceAll("-"," ")??x,level:"sub"});return out;})();

function UserRightsPage(){
 const [users,setUsers]=useState<Profile[]>([]),[selected,setSelected]=useState(""),[perms,setPerms]=useState<Record<string,Perm>>({}),[me,setMe]=useState("");
 useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user)return;setMe(user.id);const {data,error}=await supabase.from("profiles").select("id,full_name,email").order("created_at");if(error)toast.error(error.message);setUsers(data??[]);setSelected(user.id)})()},[]);
 useEffect(()=>{if(!selected)return;(async()=>{const {data,error}=await supabase.from("user_tab_permissions").select("user_id,tab_key,can_view,can_create,can_edit").eq("user_id",selected);if(error)toast.error(error.message);const next:Record<string,Perm>={};for(const m of MODULES)next[m.key]={user_id:selected,tab_key:m.key,can_view:m.key==="/dashboard",can_create:false,can_edit:false};for(const p of data??[])next[p.tab_key]=p;setPerms(next)})()},[selected]);
 async function save(){const rows=Object.values(perms);const {error}=await supabase.from("user_tab_permissions").upsert(rows as never,{onConflict:"user_id,tab_key"});if(error)toast.error(error.message);else toast.success("User rights saved.");}
 const grouped=useMemo(()=>{const result:{main:typeof MODULES[0];children:typeof MODULES[0][]}[]=[];let current:null|{main:typeof MODULES[0];children:typeof MODULES[0][]}=null;for(const m of MODULES){if(m.level==="main"){current={main:m,children:[]};result.push(current);}else if(current)current.children.push(m);}return result},[]);
 return <AppShell title="Admin · User Rights" description="Assign View, Create and Edit rights by application main tab and sub-tab">
  <SectionCard title="Users" description="Select a user, then assign rights using the same main-tab and sub-tab structure used by the application navigation.">
   <div className="mb-5 flex flex-wrap gap-2">{users.map(u=><Button key={u.id} variant={selected===u.id?"default":"outline"} onClick={()=>setSelected(u.id)}>{u.full_name||u.email||u.id.slice(0,8)}{u.id===me?" (You)":""}</Button>)}</div>
  </SectionCard>
  {selected&&<SectionCard title="Application Rights" description="Main tabs, sub-tabs and individual reports can be assigned View, Create and Edit rights. Delete permission has been removed.">
   <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b text-left"><th className="p-3">Application tab</th><th className="p-3">View</th><th className="p-3">Create</th><th className="p-3">Edit</th></tr></thead><tbody>
    {grouped.map(g=><Fragment key={g.main.key}><tr className="border-b bg-muted/40"><td className="p-3 font-semibold">{g.main.label}</td>{(["can_view","can_create","can_edit"] as const).map(k=><td key={k} className="p-3"><input type="checkbox" checked={!!perms[g.main.key]?.[k]} onChange={e=>setPerms(x=>({...x,[g.main.key]:{...x[g.main.key],[k]:e.target.checked}}))}/></td>)}</tr>{g.children.map(m=><tr key={m.key} className="border-b"><td className="p-3 pl-8 text-muted-foreground">↳ {m.label}</td>{(["can_view","can_create","can_edit"] as const).map(k=><td key={k} className="p-3"><input type="checkbox" checked={!!perms[m.key]?.[k]} onChange={e=>setPerms(x=>({...x,[m.key]:{...x[m.key],[k]:e.target.checked}}))}/></td>)}</tr>)}</Fragment>)}
   </tbody></table></div>
   <div className="mt-5 flex justify-end"><Button onClick={()=>void save()}><Save className="mr-2 size-4"/>Save User Rights</Button></div>
  </SectionCard>}
 </AppShell>
}
