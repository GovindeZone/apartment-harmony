import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Printer, Trash2 } from "lucide-react";

export const Route=createFileRoute("/_authenticated/letter-head")({component:LetterHeadPage});

type Letter={id:string;subject:string;letter_date:string;content:string;created_at:string;updated_at:string};

function LetterHeadPage(){
 const [letters,setLetters]=useState<Letter[]>([]),[editing,setEditing]=useState<Letter|null>(null),[subject,setSubject]=useState(""),[date,setDate]=useState(()=>new Date().toISOString().slice(0,10)),[content,setContent]=useState("");
 async function load(){const {data,error}=await supabase.from("letter_heads").select("*").order("letter_date",{ascending:false});if(error)toast.error(error.message);setLetters(data??[]);}
 useEffect(()=>{void load()},[]);
 function newLetter(){setEditing(null);setSubject("");setDate(new Date().toISOString().slice(0,10));setContent("");}
 async function save(){if(!subject.trim()||!content.trim()){toast.error("Subject and Content/Body are required.");return;}const payload={subject:subject.trim(),letter_date:date,content};const q=editing?supabase.from("letter_heads").update(payload).eq("id",editing.id):supabase.from("letter_heads").insert(payload);const {error}=await q;if(error)toast.error(error.message);else{toast.success("Letter saved.");newLetter();void load();}}
 function edit(x:Letter){setEditing(x);setSubject(x.subject);setDate(x.letter_date);setContent(x.content);}
 async function remove(x:Letter){if(!window.confirm("Delete this letter?"))return;const {error}=await supabase.from("letter_heads").delete().eq("id",x.id);if(error)toast.error(error.message);else{toast.success("Letter deleted.");void load();}}
 async function printLetter(x:Letter){
 const {data:profile}=await supabase.from("apartment_settings").select("name,address,city").limit(1).maybeSingle();
 const w=window.open("","_blank","width=900,height=700");
 if(!w){toast.error("Please allow pop-ups to print the letter.");return;}
 const esc=(s:string)=>s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
 const companyName=profile?.name||"";
 const companyAddress=[profile?.address,profile?.city].filter(Boolean).join(", ");
 w.document.write(`<!doctype html><html><head><title>${esc(x.subject)}</title><style>@page{size:A4;margin:18mm 20mm}body{font-family:Arial,sans-serif;color:#111;margin:0}.header{text-align:center;border-bottom:2px solid #222;padding-bottom:12px;margin-bottom:26px}.name{font-size:22px;font-weight:700}.addr{font-size:13px;margin-top:5px}.date{text-align:right;font-size:14px;margin-bottom:24px}.subject{font-weight:700;margin-bottom:20px}.body{white-space:pre-wrap;line-height:1.65;font-size:14px}</style></head><body><div class="header"><div class="name">${esc(companyName)}</div><div class="addr">${esc(companyAddress)}</div></div><div class="date">Date: ${esc(x.letter_date)}</div><div class="subject">Subject: ${esc(x.subject)}</div><div class="body">${esc(x.content)}</div><script>window.onload=()=>{window.focus();window.print();};</script></body></html>`);w.document.close();
}
 return <AppShell title="Letter Head" description="Create, save, edit and print official apartment letters">
  <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
   <SectionCard title={editing?"Edit Letter":"Create Letter"} description="Enter the letter subject, date and body."><div className="space-y-4"><div><label className="text-sm font-medium">Subject</label><Input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Enter subject"/></div><div><label className="text-sm font-medium">Date</label><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div><div><label className="text-sm font-medium">Content / Body of Letter</label><Textarea className="min-h-[300px]" value={content} onChange={e=>setContent(e.target.value)} placeholder="Enter letter content..."/></div><div className="flex gap-2"><Button onClick={()=>void save()}>{editing?"Update Letter":"Save Letter"}</Button>{editing&&<Button variant="outline" onClick={newLetter}>Cancel</Button>}</div></div></SectionCard>
   <SectionCard title="Saved Letters" description="Edit, print or delete previously saved letters."><div className="space-y-3">{letters.map(x=><div key={x.id} className="rounded-lg border p-3"><div className="font-medium">{x.subject}</div><div className="text-xs text-muted-foreground">{x.letter_date}</div><div className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={()=>edit(x)}><Pencil className="mr-1 size-4"/>Edit</Button><Button size="sm" variant="outline" onClick={()=>void printLetter(x)}><Printer className="mr-1 size-4"/>Print</Button><Button size="sm" variant="outline" onClick={()=>void remove(x)}><Trash2 className="mr-1 size-4"/>Delete</Button></div></div>)}{!letters.length&&<p className="text-sm text-muted-foreground">No letters saved yet.</p>}</div></SectionCard>
  </div>
 </AppShell>;
}