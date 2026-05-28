/* ============================================================
   STS — Soliman Technology Solutions
   Vanilla JS + Supabase (via CDN)
   ============================================================ */

/* ====== 1) PASTE YOUR SUPABASE CREDENTIALS HERE ====== */
const SUPABASE_URL  = "https://maezylfglfqlxumqgrtf.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hZXp5bGZnbGZxbHh1bXFncnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODY0MDUsImV4cCI6MjA5NTU2MjQwNX0._dUxLPlQ4B-Z2wG3KTfgAKjcNswoWlTNR2nl52iKHn8";
/* ===================================================== */

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* ---------- STATE ---------- */
const state = {
  user: JSON.parse(localStorage.getItem("sts_user") || "null"),
  products: [],
  cart: JSON.parse(localStorage.getItem("sts_cart") || "[]"),
  lang: localStorage.getItem("sts_lang") || "en",
  theme: localStorage.getItem("sts_theme") || "dark",
};

/* ---------- I18N ---------- */
const DICT = {
  en:{tagline:"Soliman Technology Solutions",search_ph:"Search laptops...",hero_title:"Power. Precision.",
      hero_sub:"Premium laptops and computers — curated by STS.",shop_now:"Shop Now",filters:"Filters",
      price_range:"Price Range",condition:"Condition",brand:"Brand",reset:"Reset",your_cart:"Your Cart",
      total:"Total",submit_order:"Submit Order",login:"Login",register:"Register",create_account:"Create Account",
      invoice:"Digital Invoice",confirm_wa:"Contact via WhatsApp to Confirm",admin_dashboard:"Admin Dashboard",
      total_products:"Total Products",total_users:"Total Users",pending_orders:"Pending Orders",
      manage_products:"Manage Products",save:"Save",clear:"Clear",registered_users:"Registered Users",orders:"Orders"},
  ar:{tagline:"حلول سليمان التقنية",search_ph:"ابحث عن لابتوب...",hero_title:"قوة. دقة.",
      hero_sub:"لابتوبات وأجهزة كمبيوتر مختارة من STS.",shop_now:"تسوق الآن",filters:"الفلاتر",
      price_range:"نطاق السعر",condition:"الحالة",brand:"الماركة",reset:"إعادة تعيين",your_cart:"سلتك",
      total:"الإجمالي",submit_order:"تأكيد الطلب",login:"دخول",register:"تسجيل",create_account:"إنشاء حساب",
      invoice:"فاتورة رقمية",confirm_wa:"تواصل عبر واتساب للتأكيد",admin_dashboard:"لوحة الإدارة",
      total_products:"إجمالي المنتجات",total_users:"إجمالي المستخدمين",pending_orders:"طلبات معلقة",
      manage_products:"إدارة المنتجات",save:"حفظ",clear:"مسح",registered_users:"المستخدمون",orders:"الطلبات"}
};
function applyLang(){
  document.documentElement.setAttribute("data-lang",state.lang);
  document.getElementById("langLabel").textContent = state.lang==="en"?"EN":"AR";
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const k=el.dataset.i18n; if(DICT[state.lang][k]) el.textContent = DICT[state.lang][k];
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(el=>{
    const k=el.dataset.i18nPh; if(DICT[state.lang][k]) el.placeholder = DICT[state.lang][k];
  });
}
function applyTheme(){
  document.documentElement.setAttribute("data-theme",state.theme);
  document.getElementById("themeBtn").textContent = state.theme==="dark"?"🌙":"☀️";
}

/* ---------- TOAST ---------- */
function toast(msg,type="info"){
  const t=document.createElement("div"); t.className="toast "+type; t.textContent=msg;
  document.getElementById("toasts").appendChild(t);
  setTimeout(()=>{t.style.opacity=0;t.style.transform="translateX(120%)";setTimeout(()=>t.remove(),300)},3000);
}

/* ---------- HASH PASSWORDS (SHA-256) ---------- */
async function sha256(text){
  const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

/* ---------- VIEW SWITCH ---------- */
function showView(name){
  document.getElementById("view-store").style.display = name==="store"?"":"none";
  document.getElementById("view-admin").style.display = name==="admin"?"":"none";
  if(name==="admin") loadAdmin();
}

/* ---------- AUTH ---------- */
function openAuth(){
  if(state.user){
    if(confirm("Logout?")){ state.user=null; localStorage.removeItem("sts_user"); refreshAuthUI(); toast("Logged out","info"); }
    return;
  }
  document.getElementById("authModal").classList.add("show");
  document.getElementById("overlay").classList.add("show");
}
function closeAll(){
  document.querySelectorAll(".modal").forEach(m=>m.classList.remove("show"));
  document.getElementById("overlay").classList.remove("show");
  toggleCart(false);
}
document.querySelectorAll(".tab").forEach(t=>t.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  t.classList.add("active");
  document.getElementById("loginForm").style.display    = t.dataset.tab==="login"?"":"none";
  document.getElementById("registerForm").style.display = t.dataset.tab==="register"?"":"none";
}));
function validPhone(p){ return /^(010|011|012|015)[0-9]{8}$/.test(p); }

/* live password meter */
document.getElementById("rPass").addEventListener("input",e=>{
  const v=e.target.value; let s=0;
  if(v.length>=6)s++; if(v.length>=10)s++; if(/[A-Z]/.test(v))s++; if(/[0-9]/.test(v))s++; if(/[^A-Za-z0-9]/.test(v))s++;
  const pct=(s/5)*100; const bar=document.getElementById("meterBar"); bar.style.width=pct+"%";
  const colors=["#ef4444","#f97316","#f59e0b","#22d3ee","#22c55e"];
  bar.style.background=colors[Math.max(0,s-1)]||"#ef4444";
  document.getElementById("meterText").textContent=["Too short","Weak","Fair","Good","Strong","Excellent"][s];
});

document.getElementById("registerForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const first=rFirst.value.trim(), last=rLast.value.trim(), phone=rPhone.value.trim(), pass=rPass.value;
  if(!validPhone(phone)) return toast("Phone must be 11 digits, start 010/011/012/015","error");
  if(pass.length<6) return toast("Password too short","error");
  const hashed = await sha256(pass);
  const {data,error} = await sb.from("users").insert({first_name:first,last_name:last,phone,password:hashed}).select().single();
  if(error){ toast(error.message.includes("duplicate")?"Phone already registered":error.message,"error"); return; }
  state.user=data; localStorage.setItem("sts_user",JSON.stringify(data)); refreshAuthUI(); closeAll();
  toast("Welcome, "+data.first_name+"!","success"); loadProducts();
});
document.getElementById("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const phone=loginPhone.value.trim(), pass=loginPass.value;
  if(!validPhone(phone)) return toast("Invalid Egyptian phone","error");
  const hashed = await sha256(pass);
  const {data,error}=await sb.from("users").select("*").eq("phone",phone).eq("password",hashed).maybeSingle();
  if(error||!data) return toast("Invalid credentials","error");
  state.user=data; localStorage.setItem("sts_user",JSON.stringify(data)); refreshAuthUI(); closeAll();
  toast("Welcome back, "+data.first_name+"!","success"); loadProducts();
});
function refreshAuthUI(){
  const btn=document.getElementById("authBtn");
  btn.textContent = state.user ? "👤 "+state.user.first_name : "👤";
  document.getElementById("adminBtn").style.display = state.user?.role==="admin" ? "" : "none";
}

/* ---------- PRODUCTS ---------- */
async function loadProducts(){
  const grid=document.getElementById("productGrid");
  grid.innerHTML = Array.from({length:6}).map(()=>'<div class="skel"></div>').join("");
  const {data,error}=await sb.from("products").select("*").order("created_at",{ascending:false});
  if(error){ toast(error.message,"error"); return; }
  state.products=data||[];
  buildBrandFilters();
  renderProducts();
}
function buildBrandFilters(){
  const brands=[...new Set(state.products.map(p=>p.brand))];
  document.getElementById("brandFilters").innerHTML = brands.map(b=>
    `<label><input type="checkbox" value="${b}" checked> ${b}</label>`).join("");
  document.querySelectorAll("#brandFilters input,#condFilters input").forEach(c=>c.addEventListener("change",renderProducts));
}
function renderProducts(){
  const grid=document.getElementById("productGrid");
  const maxP=+document.getElementById("priceMax").value;
  document.getElementById("priceMaxVal").textContent="$"+maxP;
  const conds=[...document.querySelectorAll("#condFilters input:checked")].map(i=>i.value);
  const brands=[...document.querySelectorAll("#brandFilters input:checked")].map(i=>i.value);
  const q=(document.getElementById("liveSearch").value||"").toLowerCase();
  const filtered=state.products.filter(p =>
    p.price<=maxP && conds.includes(p.condition) && brands.includes(p.brand) &&
    (!q || p.name.toLowerCase().includes(q))
  );
  if(!filtered.length){ grid.innerHTML='<p style="color:var(--muted)">No products match your filters.</p>'; return; }
  grid.innerHTML = filtered.map(p=>`
    <article class="card">
      <div class="img"><img src="${p.image_url||'https://via.placeholder.com/400x300?text=Laptop'}" alt="${p.name}" loading="lazy"/></div>
      <div class="body">
        <div class="name">${p.name}</div>
        <div class="meta"><span>${p.brand}</span><span>${p.condition}</span></div>
        <div class="price">$${(+p.price).toFixed(2)}</div>
        <button onclick="addToCart('${p.id}')">+ Add to Cart</button>
      </div>
    </article>`).join("");
}

/* ---------- SEARCH SUGGEST ---------- */
document.getElementById("liveSearch").addEventListener("input",e=>{
  const q=e.target.value.toLowerCase().trim();
  const box=document.getElementById("searchSuggest");
  if(!q){ box.style.display="none"; renderProducts(); return; }
  const matches=state.products.filter(p=>p.name.toLowerCase().includes(q)).slice(0,6);
  box.innerHTML=matches.map(p=>`<div onclick="pickSuggest('${p.name.replace(/'/g,"&#39;")}')">${p.name}</div>`).join("");
  box.style.display=matches.length?"block":"none";
  renderProducts();
});
function pickSuggest(n){ document.getElementById("liveSearch").value=n; document.getElementById("searchSuggest").style.display="none"; renderProducts(); }

document.getElementById("priceMax").addEventListener("input",renderProducts);
function resetFilters(){
  document.getElementById("priceMax").value=5000;
  document.querySelectorAll("#condFilters input,#brandFilters input").forEach(c=>c.checked=true);
  document.getElementById("liveSearch").value="";
  renderProducts();
}

/* ---------- CART ---------- */
function saveCart(){ localStorage.setItem("sts_cart",JSON.stringify(state.cart)); renderCart(); }
function addToCart(id){
  if(!state.user) return (openAuth(), toast("Please login first","info"));
  const p=state.products.find(x=>x.id===id); if(!p) return;
  const ex=state.cart.find(x=>x.id===id);
  if(ex) ex.qty++; else state.cart.push({id:p.id,name:p.name,price:+p.price,image_url:p.image_url,qty:1});
  saveCart(); toast("Added to cart","success"); toggleCart(true);
}
function renderCart(){
  const wrap=document.getElementById("cartItems");
  document.getElementById("cartCount").textContent=state.cart.reduce((a,b)=>a+b.qty,0);
  if(!state.cart.length){ wrap.innerHTML='<p style="color:var(--muted);padding:20px;text-align:center">Cart is empty.</p>'; }
  else{
    wrap.innerHTML=state.cart.map(i=>`
      <div class="cart-item">
        <img src="${i.image_url||'https://via.placeholder.com/60'}"/>
        <div style="flex:1">
          <div style="font-weight:600">${i.name}</div>
          <div style="color:var(--neon);font-family:var(--display)">$${(i.price*i.qty).toFixed(2)}</div>
        </div>
        <div class="qty">
          <button onclick="chgQty('${i.id}',-1)">−</button>
          <span>${i.qty}</span>
          <button onclick="chgQty('${i.id}',1)">+</button>
        </div>
      </div>`).join("");
  }
  document.getElementById("cartTotal").textContent="$"+state.cart.reduce((a,b)=>a+b.price*b.qty,0).toFixed(2);
}
function chgQty(id,d){
  const i=state.cart.find(x=>x.id===id); if(!i) return;
  i.qty+=d; if(i.qty<=0) state.cart=state.cart.filter(x=>x.id!==id);
  saveCart();
}
function toggleCart(open){
  const dr=document.getElementById("cartDrawer"), ov=document.getElementById("overlay");
  if(open){ dr.classList.add("open"); ov.classList.add("show"); }
  else    { dr.classList.remove("open"); if(!document.querySelector(".modal.show")) ov.classList.remove("show"); }
}
document.getElementById("openCart").addEventListener("click",()=>{ if(!state.user) return (openAuth(),toast("Please login first","info")); toggleCart(true); });

/* ---------- ORDER + INVOICE ---------- */
document.getElementById("submitOrderBtn").addEventListener("click",async ()=>{
  if(!state.user) return openAuth();
  if(!state.cart.length) return toast("Cart is empty","error");
  const total=state.cart.reduce((a,b)=>a+b.price*b.qty,0);
  const {error}=await sb.from("orders").insert({
    user_id:state.user.id,
    customer_name:state.user.first_name+" "+state.user.last_name,
    customer_phone:state.user.phone,
    items:state.cart, total
  });
  if(error){ toast(error.message,"error"); return; }
  toast("Order saved!","success"); showInvoice(total);
});

function showInvoice(total){
  const body=document.getElementById("invoiceBody");
  body.innerHTML = state.cart.map(i=>`<div class="inv-row"><span>${i.name} × ${i.qty}</span><span>$${(i.price*i.qty).toFixed(2)}</span></div>`).join("")
    + `<div class="inv-total"><span>Total</span><span>$${total.toFixed(2)}</span></div>`;
  const itemsTxt=state.cart.map(i=>`${i.name} (x${i.qty})`).join(", ");
  const msg=`Hello STS, I am ${state.user.first_name} ${state.user.last_name}. I just placed an order for ${itemsTxt}. Total Price: $${total.toFixed(2)}. Please confirm my order.`;
  document.getElementById("waBtn").href="https://wa.me/201202427525?text="+encodeURIComponent(msg);
  document.getElementById("invoiceModal").classList.add("show");
  document.getElementById("overlay").classList.add("show");
  toggleCart(false);
  state.cart=[]; saveCart();
}

/* ============================================================
   ADMIN DASHBOARD
   ============================================================ */
async function loadAdmin(){
  if(state.user?.role!=="admin"){ toast("Admin only","error"); showView("store"); return; }
  const [{count:pc},{count:uc},{data:orders}]=await Promise.all([
    sb.from("products").select("*",{count:"exact",head:true}),
    sb.from("users").select("*",{count:"exact",head:true}),
    sb.from("orders").select("*").eq("status","pending")
  ]);
  statProducts.textContent=pc||0; statUsers.textContent=uc||0; statOrders.textContent=orders?.length||0;
  loadAdminProducts(); loadAdminUsers(); loadAdminOrders();
}
async function loadAdminProducts(){
  const {data}=await sb.from("products").select("*").order("created_at",{ascending:false});
  const t=document.getElementById("adminProductsTable");
  t.innerHTML=`<thead><tr><th>Name</th><th>Brand</th><th>Condition</th><th>Price</th><th></th></tr></thead><tbody>`+
    (data||[]).map(p=>`<tr>
      <td>${p.name}</td><td>${p.brand}</td><td>${p.condition}</td><td>$${(+p.price).toFixed(2)}</td>
      <td><button onclick='editProduct(${JSON.stringify(p).replace(/'/g,"&#39;")})'>Edit</button>
          <button class="danger" onclick="delProduct('${p.id}')">Delete</button></td>
    </tr>`).join("")+`</tbody>`;
}
async function loadAdminUsers(){
  const {data}=await sb.from("users").select("first_name,last_name,phone,role,created_at").order("created_at",{ascending:false});
  document.getElementById("adminUsersTable").innerHTML=`<thead><tr><th>Name</th><th>Phone</th><th>Role</th></tr></thead><tbody>`+
    (data||[]).map(u=>`<tr><td>${u.first_name} ${u.last_name}</td><td>${u.phone}</td><td>${u.role}</td></tr>`).join("")+`</tbody>`;
}
async function loadAdminOrders(){
  const {data}=await sb.from("orders").select("*").order("created_at",{ascending:false});
  document.getElementById("adminOrdersTable").innerHTML=
    `<thead><tr><th>Customer</th><th>Phone</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>`+
    (data||[]).map(o=>{
      const items=(o.items||[]).map(i=>`${i.name}×${i.qty}`).join(", ");
      return `<tr>
        <td>${o.customer_name}</td><td><a href="tel:${o.customer_phone}">${o.customer_phone}</a></td>
        <td style="max-width:240px">${items}</td><td>$${(+o.total).toFixed(2)}</td><td>${o.status}</td>
        <td>${o.status==="pending"?`<button onclick="confirmOrder('${o.id}')">Confirm</button>`:""}</td>
      </tr>`;
    }).join("")+`</tbody>`;
}
async function confirmOrder(id){
  const {error}=await sb.from("orders").update({status:"confirmed"}).eq("id",id);
  if(error) return toast(error.message,"error");
  toast("Order confirmed","success"); loadAdmin();
}
document.getElementById("productForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const payload={name:pname.value,price:+pprice.value,brand:pbrand.value,condition:pcondition.value,image_url:pimage.value,description:pdesc.value};
  const id=pid.value;
  const op=id ? sb.from("products").update(payload).eq("id",id) : sb.from("products").insert(payload);
  const {error}=await op;
  if(error) return toast(error.message,"error");
  toast(id?"Updated":"Created","success"); resetProductForm(); loadAdmin(); loadProducts();
});
function editProduct(p){
  pid.value=p.id; pname.value=p.name; pprice.value=p.price; pbrand.value=p.brand;
  pcondition.value=p.condition; pimage.value=p.image_url||""; pdesc.value=p.description||"";
  window.scrollTo({top:0,behavior:"smooth"});
}
function resetProductForm(){ document.getElementById("productForm").reset(); pid.value=""; }
async function delProduct(id){
  if(!confirm("Delete this product?")) return;
  const {error}=await sb.from("products").delete().eq("id",id);
  if(error) return toast(error.message,"error");
  toast("Deleted","success"); loadAdmin(); loadProducts();
}

/* ---------- HEADER BUTTONS ---------- */
document.getElementById("themeBtn").addEventListener("click",()=>{
  state.theme = state.theme==="dark"?"light":"dark";
  localStorage.setItem("sts_theme",state.theme); applyTheme();
});
document.getElementById("langBtn").addEventListener("click",()=>{
  state.lang = state.lang==="en"?"ar":"en";
  localStorage.setItem("sts_lang",state.lang); applyLang();
});

/* ---------- INIT ---------- */
document.getElementById("year").textContent=new Date().getFullYear();
applyTheme(); applyLang(); refreshAuthUI(); renderCart(); loadProducts();
