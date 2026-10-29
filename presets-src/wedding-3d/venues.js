import {weddingInfo as data} from './venue-data.js';
import {VENUES,findNearbyVenue} from './venue-zones.js';
const countCharacters=value=>Array.from(new Intl.Segmenter('id',{granularity:'grapheme'}).segment(value)).length;
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};

export function createVenueExperience({getEnabled,onPause,onResume}){
 const $=id=>document.getElementById(id),dialog=$('venueDialog'),content=$('venueContent'),status=$('venueStatus'),pagination=$('venuePagination');
 let active=null,nearby=null,index=0,items=[],mode='choice',wishes=[],loading=false,sending=false,requestVersion=0,returnFocus=null;
 const draft={name:'',message:'',requestId:null};
 const showStatus=text=>{status.textContent=text;};
 function pager(list){items=list;index=Math.min(index,Math.max(0,list.length-1));pagination.hidden=list.length<2;$('venuePrevious').disabled=index<=0;$('venueNext').disabled=index>=list.length-1;$('venuePage').textContent=`${index+1} / ${list.length}`;}
 function button(label,fn,className='venue-primary'){const b=node('button',className,label);b.type='button';b.onclick=fn;return b;}
 function field(list,label,value,className){list.append(node('dt','',label),node('dd',className,value));}
 function backToChoices(){mode='choice';index=0;requestVersion++;showStatus('');render();}
 async function api(options={}){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
   try{const response=await fetch('/api/wishes',{credentials:'same-origin',...options,headers:{'Content-Type':'application/json'},signal:controller.signal});
     const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||'Ucapan belum dapat dimuat. Coba lagi.');return result;
   }catch(error){if(error.name==='AbortError')throw Error('Koneksi terlalu lama. Coba lagi; tulisanmu tetap tersimpan di formulir.');throw error;}
   finally{clearTimeout(timer);}
 }
 function renderStory(){
   pager(data.stories);const item=items[index],card=node('article','venue-story');
   card.append(node('p','venue-story-time',item.time),node('h3','',item.title),node('p','',item.description));content.append(card);
 }
 function renderEvents(){
   pager(data.events);const item=items[index],card=node('article','venue-event');
   card.append(node('h3','',item.title),node('p','venue-event-date',item.date),node('p','venue-event-time',item.time),node('p','venue-event-place',item.venue),node('p','venue-event-address',item.address));
   const maps=node('a','venue-link',item.mapsLabel||'Buka Google Maps');maps.href=item.mapsUrl||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(item.venue+', '+item.address);maps.target='_blank';maps.rel='noopener noreferrer';card.append(maps);if(item.description)card.append(node('p','venue-event-message',item.description));content.append(card);
 }
 function renderGallery(){
   pager(data.photos);const item=items[index],figure=node('figure','venue-photo'),photo=node('img'),error=node('p','venue-photo-error','Foto belum dapat dimuat. Silakan pilih foto berikutnya.');
   photo.width=800;photo.height=600;photo.alt=item.alt;photo.decoding='async';error.hidden=true;
   photo.onerror=()=>{photo.hidden=true;error.hidden=false;};photo.src=item.src;
   const credit=node('a','venue-credit',`Foto: ${item.credit} · Unsplash`);credit.href=item.url;credit.target='_blank';credit.rel='noopener noreferrer';
   figure.append(photo,error,node('figcaption','',item.alt),credit);content.append(figure);
 }
 function renderGifts(){
   pager(data.gifts);const item=items[index],card=node('article','venue-gift'),list=node('dl');card.append(node('h3','',item.title));
   if(item.type==='bank'){field(list,'Bank',item.bank);field(list,'Nomor rekening',item.number,'account-number');field(list,'Atas nama',item.owner);}
   else{field(list,'Penerima',item.owner);field(list,'Alamat pengiriman',item.address);}
   card.append(list);
   if(item.note)card.append(node('p','venue-gift-note',item.note));
   if(item.copyAllowed!==false)card.append(button(item.type==='bank'?'Salin nomor rekening':'Salin alamat',async()=>{
     try{await navigator.clipboard.writeText(item.type==='bank'?item.number:item.address);showStatus('Berhasil disalin.');}catch{showStatus('Belum bisa menyalin otomatis. Kamu bisa memilih dan menyalin teks di atas.');}
   }));content.append(card);
 }
 function renderWishForm(){
   content.append(button('Kembali ke pilihan',backToChoices,'venue-wish-back'));
   const form=node('form','venue-wish-form'),nameLabel=node('label','','Namamu'),name=node('input'),messageLabel=node('label','',`Untuk ${data.couple},`),message=node('textarea'),count=node('p','venue-wish-count'),submit=node('button','venue-primary',sending?'Mengirim…':'Kirim ucapan');
   form.id='venueWishForm';name.id='wishName';name.name='name';name.required=true;name.maxLength=32;name.autocomplete='name';name.value=draft.name;name.placeholder='Tulis namamu';nameLabel.htmlFor=name.id;
   message.id='wishMessage';message.name='message';message.required=true;message.rows=3;message.value=draft.message;message.placeholder='Semoga bahagia bersama selamanya ♡';messageLabel.htmlFor=message.id;message.setAttribute('aria-describedby','wishCharacterCount wishPrivacy');count.id='wishCharacterCount';submit.type='submit';submit.id='sendVenueWish';
   const note=node('small','', 'Ucapanmu akan tersimpan dan dapat dibaca oleh tamu lain.');note.id='wishPrivacy';
   function update(){draft.name=name.value;draft.message=message.value;const length=countCharacters(message.value.trim());count.textContent=`${countCharacters(message.value)} / 50 karakter`;submit.disabled=sending||!name.value.trim()||length<1||length>50;submit.setAttribute('aria-busy',String(sending));}
   for(const input of [name,message])input.addEventListener('input',()=>{draft.requestId=null;showStatus('');update();});
   form.addEventListener('submit',async e=>{
     e.preventDefault();update();if(submit.disabled)return;
     const payload={name:draft.name.trim(),message:draft.message.trim(),requestId:draft.requestId||crypto.randomUUID()};draft.requestId=payload.requestId;sending=true;name.disabled=message.disabled=true;submit.textContent='Mengirim…';update();showStatus('');
     try{const result=await api({method:'POST',body:JSON.stringify(payload)});draft.message='';draft.requestId=null;wishes=[result.wish,...wishes.filter(w=>w.id!==result.wish.id)].slice(0,15);sending=false;
       if(active?.id==='wishes'&&dialog.open){requestVersion++;mode='read';index=0;loading=false;render();showStatus('Ucapanmu sudah tersimpan. Terima kasih!');}
     }catch(error){sending=false;if(active?.id==='wishes'&&dialog.open){mode='write';render();showStatus(error.message||'Ucapan belum terkirim. Coba lagi; tulisanmu tetap ada.');}}
   });
   name.disabled=message.disabled=sending;form.append(nameLabel,name,messageLabel,message,count,submit,note);content.append(form);update();
 }
 function renderWishList(){
   content.append(button('Kembali ke pilihan',backToChoices,'venue-wish-back'));
   if(loading){content.append(node('p','venue-empty','Membuka ucapan…'));return;}
   if(!wishes.length){content.append(node('p','venue-empty','Belum ada ucapan. Jadilah yang pertama menitipkan doa.'),button('Tulis ucapan',()=>{mode='write';render();}));return;}
   pager(wishes);const wish=items[index],card=node('article','venue-wish-paper'),date=node('time');date.dateTime=new Date(wish.createdAt).toISOString();date.textContent=new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric'}).format(new Date(wish.createdAt));
   card.append(node('p','to-couple',`Untuk ${data.couple},`),node('blockquote','',wish.message),node('p','wish-sender',wish.name),date);content.append(card);
 }
 async function loadWishes(){
   mode='read';index=0;loading=true;const version=++requestVersion;showStatus('');render();
   try{const result=await api();if(version!==requestVersion||active?.id!=='wishes'||!dialog.open)return;wishes=result.wishes;loading=false;render();}
   catch(error){if(version!==requestVersion||active?.id!=='wishes'||!dialog.open)return;loading=false;content.replaceChildren(button('Kembali ke pilihan',backToChoices,'venue-wish-back'),node('p','venue-empty','Ucapan belum dapat dimuat.'),button('Coba lagi',loadWishes));showStatus(error.message);}
 }
 function renderWishes(){
   if(mode==='write')return renderWishForm();if(mode==='read')return renderWishList();
   const choice=node('div','venue-wish-choice');for(const [icon,label,action] of [['✉','Kirim ucapan',()=>{mode='write';render();}],['♡','Lihat ucapan',loadWishes]]){const b=button('',action,'');b.append(node('span','',icon),node('strong','',label));choice.append(b);}content.append(choice);
 }
 function render(){
   content.replaceChildren();pagination.hidden=true;items=[];
   if(!active)return;
   ({story:renderStory,events:renderEvents,gallery:renderGallery,gifts:renderGifts,wishes:renderWishes})[active.id]();
 }
 function open(venue){
   if(!getEnabled()||!venue)return false;requestVersion++;active=venue;index=0;mode='choice';loading=false;showStatus('');
   $('venueLocation').textContent=venue.location;$('venueTitle').textContent=venue.title;
   const intros={story:'Perjalanan kecil yang membawa kami sampai di sini.',gallery:'Momen-momen bahagia dalam satu bingkai.',events:'Sampai bertemu di hari bahagia kami.',gifts:data.giftIntro,wishes:`Sepucuk doa dan harapan untuk ${data.couple}.`};$('venueIntro').textContent=intros[venue.id];
   render();returnFocus=document.activeElement;onPause();dialog.showModal();dialog.scrollTop=0;$('venueClose').focus();return true;
 }
 function close(){if(dialog.open)dialog.close();}
 dialog.addEventListener('close',()=>{active=null;requestVersion++;onResume();if(returnFocus?.isConnected&&!returnFocus.hidden)returnFocus.focus();});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
 $('venueClose').onclick=close;$('venueReturn').onclick=close;
 $('venuePrevious').onclick=()=>{if(index>0){index--;showStatus('');render();}};$('venueNext').onclick=()=>{if(index<items.length-1){index++;showStatus('');render();}};
 dialog.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(e.target.tagName))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();(e.key==='ArrowLeft'?$('venuePrevious'):$('venueNext')).click();}});
 addEventListener('keydown',e=>{if(!getEnabled()||dialog.open||['INPUT','TEXTAREA','BUTTON'].includes(e.target.tagName)||e.target.isContentEditable)return;if(e.key.toLowerCase()==='e'&&nearby){e.preventDefault();open(nearby);}});
 return {setGuestName(name){draft.name=name;},get isOpen(){return dialog.open;},get nearby(){return nearby;},openPlace(place){return open(VENUES.find(v=>v.place===place));},update(position){
   const next=getEnabled()&&!dialog.open?findNearbyVenue(position.x,position.z):null;
   nearby=next;return next;
 }};
}
