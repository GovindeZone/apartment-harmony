import { useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SectionCard, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { familyMembersQuery, flatsQuery, mcRepositoryQuery, residentsQuery, type FamilyMember, type Flat, type McRecord, type Resident } from "@/lib/api";

const DESIGNATIONS = ["President","Vice President","Secretary","Joint Secretary","Treasurer","Joint Treasurer","Committee Member"];

async function requireTab() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw redirect({ to: "/auth" });
  const { data: admin } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (admin) return;
  const { data: permission } = await supabase.from("user_tab_permissions").select("can_view").eq("user_id", user.id).eq("tab_key", "mc_repository").maybeSingle();
  if (!permission?.can_view) throw redirect({ to: "/dashboard" });
}

export const Route = createFileRoute("/_authenticated/mc-repository")({
  head: () => ({ meta: [{ title: "MC Repository — Indus Anantya Apartment" }] }),
  beforeLoad: requireTab,
  component: McRepositoryPage,
});

function McRepositoryPage() {
  const qc = useQueryClient();
  const flats = useQuery(flatsQuery);
  const residents = useQuery(residentsQuery);
  const family = useQuery(familyMembersQuery);
  const records = useQuery(mcRepositoryQuery);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<McRecord | null | undefined>(undefined);
  const rows = (records.data ?? []).filter(r => {
    const q = search.trim().toLowerCase();
    return !q || [r.flat_no,r.member_name,r.designation,r.primary_portfolio ?? "",r.secondary_portfolio ?? "",r.phone ?? "",r.email ?? ""].some(v => v.toLowerCase().includes(q));
  });

  const save = useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: Record<string, unknown> }) => {
      const result = id ? await supabase.from("mc_repository").update(payload as never).eq("id", id) : await supabase.from("mc_repository").insert(payload as never);
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => { toast.success("MC record saved"); setEditing(undefined); qc.invalidateQueries({queryKey:["mc_repository"]}); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const {error}=await supabase.from("mc_repository").delete().eq("id",id); if(error) throw new Error(error.message); },
    onSuccess: () => { toast.success("MC record deleted"); qc.invalidateQueries({queryKey:["mc_repository"]}); },
    onError: (e: Error) => toast.error(e.message),
  });

  return <AppShell title="MC Repository" description="Managing Committee member records by period and flat" actions={<Button className="gap-2" onClick={()=>setEditing(null)}><Plus className="size-4"/> Add MC member</Button>}>
    <div className="mb-4 relative max-w-xl"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" placeholder="Search flat, member, designation, portfolio or contact" value={search} onChange={e=>setSearch(e.target.value)}/></div>
    <SectionCard>{!rows.length?<EmptyState message="No MC repository records found."/>:<div className="overflow-x-auto"><Table><TableHeader><TableRow>
      <TableHead>Period</TableHead><TableHead>Flat</TableHead><TableHead>Committee member</TableHead><TableHead>Designation</TableHead><TableHead>Primary Portfolio</TableHead><TableHead>Secondary Portfolio</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead className="text-right">Actions</TableHead>
    </TableRow></TableHeader><TableBody>{rows.map(r=><TableRow key={r.id}><TableCell className="whitespace-nowrap">{r.period_from} → {r.period_to}</TableCell><TableCell>{r.flat_no}</TableCell><TableCell className="font-medium">{r.member_name}</TableCell><TableCell>{r.designation}</TableCell><TableCell>{r.primary_portfolio??"—"}</TableCell><TableCell>{r.secondary_portfolio??"—"}</TableCell><TableCell>{r.phone??"—"}</TableCell><TableCell>{r.email??"—"}</TableCell><TableCell className="text-right whitespace-nowrap"><Button variant="ghost" size="icon" onClick={()=>setEditing(r)}><Pencil className="size-4"/></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={()=>{if(confirm("Delete this MC record?"))remove.mutate(r.id)}}><Trash2 className="size-4"/></Button></TableCell></TableRow>)}</TableBody></Table></div>}</SectionCard>
    <McDialog key={editing?.id??"new"} open={editing!==undefined} record={editing??null} flats={flats.data??[]} residents={residents.data??[]} family={family.data??[]} pending={save.isPending} onClose={()=>setEditing(undefined)} onSave={p=>save.mutate({id:editing?.id,payload:p})}/>
  </AppShell>;
}

function McDialog({open,record,flats,residents,family,pending,onClose,onSave}:{open:boolean;record:McRecord|null;flats:Flat[];residents:Resident[];family:FamilyMember[];pending:boolean;onClose:()=>void;onSave:(p:Record<string,unknown>)=>void}) {
  const [flatId,setFlatId]=useState(record?.flat_id??"");
  const [memberKey,setMemberKey]=useState(record?(record.family_member_id?"family:"+record.family_member_id:"resident:"+record.resident_id):"");
  const flatOwners=useMemo(()=>residents.filter(r=>r.flat_id===flatId && r.resident_type==="owner"),[residents,flatId]);
  const ownerIds=new Set(flatOwners.map(r=>r.id));
  const members=family.filter(f=>ownerIds.has(f.resident_id));
  const selectedFamily=members.find(f=>memberKey==="family:"+f.id);
  function changeFlat(v:string){setFlatId(v);setMemberKey("");}
  function changeMember(v:string){setMemberKey(v);const owner=flatOwners.find(r=>v==="resident:"+r.id);const fm=members.find(f=>v==="family:"+f.id);const phone=owner?.phone??fm?.phone??"";const phoneEl=document.getElementById("mc-phone") as HTMLInputElement|null;if(phoneEl)phoneEl.value=phone;}
  function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const from=String(f.get("period_from")??"");const to=String(f.get("period_to")??"");if(!flatId||!memberKey){toast.error("Select a flat and committee member.");return}if(to<from){toast.error("Period To cannot be before Period From.");return}const parts=memberKey.split(":");const kind=parts[0];const id=parts[1];onSave({period_from:from,period_to:to,flat_id:flatId,resident_id:kind==="family"?(selectedFamily?.resident_id??""):id,family_member_id:kind==="family"?id:null,designation:String(f.get("designation")??""),primary_portfolio:String(f.get("primary_portfolio")??"").trim()||null,secondary_portfolio:String(f.get("secondary_portfolio")??"").trim()||null,phone:String(f.get("phone")??"").replace(/\D/g,"")||null,email:String(f.get("email")??"").trim()||null});}
  return <Dialog open={open} onOpenChange={v=>!v&&onClose()}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{record?"Edit MC Repository Record":"Add MC Repository Record"}</DialogTitle></DialogHeader>
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
      <Field name="period_from" label="Period From" type="date" required defaultValue={record?.period_from??""}/><Field name="period_to" label="Period To" type="date" required defaultValue={record?.period_to??""}/>
      <div className="space-y-2"><Label>Flat number</Label><select value={flatId} onChange={e=>changeFlat(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required><option value="">Select flat</option>{flats.map(f=><option key={f.id} value={f.id}>{f.flat_no}</option>)}</select></div>
      <div className="space-y-2"><Label>Name of Committee member</Label><select value={memberKey} onChange={e=>changeMember(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required disabled={!flatId}><option value="">Select owner / family member</option>{flatOwners.map(r=><option key={r.id} value={"resident:"+r.id}>{r.full_name} (Owner)</option>)}{members.map(f=><option key={f.id} value={"family:"+f.id}>{f.full_name} (Family Member)</option>)}</select><p className="text-xs text-muted-foreground">Only the selected flat's Owner and that Owner's family members are listed.</p></div>
      <div className="space-y-2"><Label>Designation</Label><select name="designation" defaultValue={record?.designation??DESIGNATIONS[0]} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required>{DESIGNATIONS.map(d=><option key={d}>{d}</option>)}</select></div>
      <Field name="primary_portfolio" label="Primary Portfolio" defaultValue={record?.primary_portfolio??""}/><Field name="secondary_portfolio" label="Secondary Portfolio" defaultValue={record?.secondary_portfolio??""}/>
      <Field id="mc-phone" name="phone" label="Phone number" defaultValue={record?.phone??""}/><Field name="email" label="Email" type="email" defaultValue={record?.email??""}/>
      <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending?"Saving…":"Save"}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
function Field({name,label,type="text",required,defaultValue,id}:{name:string;label:string;type?:string;required?:boolean;defaultValue?:string;id?:string}){return <div className="space-y-2"><Label htmlFor={id??name}>{label}</Label><Input id={id??name} name={name} type={type} required={required} defaultValue={defaultValue}/></div>}
