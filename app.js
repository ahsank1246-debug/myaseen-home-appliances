
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAFog2DAuKvu_1l_6mg2HQWE9VWgjze6_c",
  authDomain: "yaseen-home-appliances.firebaseapp.com",
  projectId: "yaseen-home-appliances",
  storageBucket: "yaseen-home-appliances.firebasestorage.app",
  messagingSenderId: "788697777363",
  appId: "1:788697777363:web:ec2de4afe6805c6ffc8026",
  measurementId: "G-G742PKJX3W"
};

// Cloudinary settings: fill these in after configuring your unsigned upload preset.
const CLOUDINARY_CLOUD_NAME = "";
const CLOUDINARY_UPLOAD_PRESET = "";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const ref = collection(db, "products");
const settings = doc(db, "siteSettings", "main");
const WA = "923218700974";

let products = [];
let user = null;
let galleryImages = [];
let galleryIndex = 0;

const $ = id => document.getElementById(id);
const money = n => "Rs. " + Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 });

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 2500);
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function getImages(product) {
  return Array.isArray(product.images)
    ? [...new Set(product.images.map(safeUrl).filter(Boolean))].slice(0, 10)
    : [];
}

function price(product) {
  const amount = Number(product.price || 0);
  const discount = Number(product.discount || 0);

  return product.saleOn && discount > 0
    ? product.discountType === "fixed"
      ? Math.max(0, amount - discount)
      : Math.max(0, amount * (1 - Math.min(100, discount) / 100))
    : amount;
}

function percent(product) {
  return Number(product.price) > 0
    ? Math.round((Number(product.price) - price(product)) / Number(product.price) * 100)
    : 0;
}

function wa(message) {
  return "https://wa.me/" + WA + "?text=" + encodeURIComponent(message);
}

function render() {
  const categories = [
    ...new Set(
      products
        .filter(p => p.active !== false && Number(p.stock) > 0)
        .map(p => p.category || "Other")
    )
  ].sort();

  const oldCategory = $("category").value;

  $("category").innerHTML =
    '<option value="all">All categories</option>' +
    categories.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");

  if (categories.includes(oldCategory)) $("category").value = oldCategory;

  const search = $("search").value.toLowerCase();
  const category = $("category").value;
  const sort = $("sort").value;

  const list = products.filter(p =>
    p.active !== false &&
    Number(p.stock) > 0 &&
    (category === "all" || (p.category || "Other") === category) &&
    (`${p.name || ""} ${p.description || ""}`).toLowerCase().includes(search)
  );

  if (sort === "low") list.sort((a, b) => price(a) - price(b));
  if (sort === "high") list.sort((a, b) => price(b) - price(a));

  $("status").textContent = list.length
    ? ""
    : products.length
      ? "No products match your search."
      : "No products added yet. Please check back soon.";

  $("grid").innerHTML = list.map((p, i) => {
    const images = getImages(p);
    const low = Number(p.stock) <= 3;
    const sale = p.saleOn && Number(p.discount) > 0;
    const firstImage = images[0];

    return `
      <article class="card" style="animation-delay:${Math.min(i * 60, 300)}ms">
        <button class="card-photo-button" type="button" data-view="${esc(p.id)}"
          aria-label="View ${esc(p.name)} photos">
          ${firstImage
            ? `<img class="photo" src="${esc(firstImage)}" loading="lazy" alt="${esc(p.name)}">`
            : '<div class="photo photo-placeholder">🏠</div>'}
          ${images.length > 1 ? `<span class="photo-count-badge">📷 ${images.length} photos</span>` : ""}
        </button>

        ${sale ? `<div class="sale-tag">${percent(p)}% OFF</div>` : ""}

        <div class="tag">${esc(p.category || "Home appliance")} ·
          <span class="${low ? "limited" : ""}">${low ? "Limited stock" : "In stock"}</span>
        </div>

        <div class="name">${esc(p.name)}</div>
        <div class="desc">${esc(p.description || "Selected for everyday comfort.")}</div>

        <div class="price">
          ${sale ? `<span class="old">${money(p.price)}</span>` : ""}
          ${Number(p.price) > 0 ? money(price(p)) : "Price on request"}
        </div>

        <div class="actions">
          <button class="btn ghost" type="button" data-view="${esc(p.id)}">
            View details${images.length ? ` · Photos (${images.length})` : ""}
          </button>
          <a class="btn glow" target="_blank" rel="noopener"
            href="${wa(`Assalam-o-Alaikum, I am interested in ${p.name} (${money(price(p))}). Please share details.`)}">
            WhatsApp order ↗
          </a>
        </div>
      </article>`;
  }).join("");

  document.querySelectorAll("[data-view]").forEach(button => {
    button.onclick = () => {
      const product = products.find(p => p.id === button.dataset.view);
      if (product) openProduct(product);
    };
  });
}

function openProduct(product) {
  galleryImages = getImages(product);
  galleryIndex = 0;

  $("detail-name").textContent = product.name || "Product";
  $("detail-category").textContent = product.category || "Home appliance";
  $("detail-description").textContent = product.description || "Selected for everyday comfort.";
  $("detail-price").textContent = Number(product.price) > 0 ? money(price(product)) : "Price on request";

  const stock = Number(product.stock || 0);
  $("detail-stock").textContent = stock <= 3
    ? `Limited stock${stock > 0 ? ` · ${stock} left` : ""}`
    : "In stock";

  $("detail-stock").classList.toggle("limited", stock <= 3);

  $("detail-whatsapp").href = wa(
    `Assalam-o-Alaikum, I am interested in ${product.name} (${money(price(product))}). Please share details.`
  );

  $("detail-thumbnails").innerHTML = galleryImages.map((src, i) => `
    <button class="thumbnail ${i === 0 ? "selected" : ""}" type="button" data-thumb="${i}"
      aria-label="View photo ${i + 1}">
      <img src="${esc(src)}" loading="lazy" alt="${esc(product.name)} photo ${i + 1}">
    </button>
  `).join("");

  document.querySelectorAll("[data-thumb]").forEach(button => {
    button.onclick = () => showPhoto(Number(button.dataset.thumb));
  });

  $("product-modal").classList.remove("hidden");
  $("product-modal").setAttribute("aria-hidden", "false");
  showPhoto(0);
}

function showPhoto(index) {
  const total = galleryImages.length;

  if (!total) {
    $("detail-main-photo").classList.add("hidden");
    $("detail-no-photo").classList.remove("hidden");
    $("photo-count").textContent = "No photos";
    $("detail-thumbnails").innerHTML = "";
    $("photo-prev").classList.add("hidden");
    $("photo-next").classList.add("hidden");
    return;
  }

  galleryIndex = (index + total) % total;

  $("detail-main-photo").src = galleryImages[galleryIndex];
  $("detail-main-photo").alt = `Product photo ${galleryIndex + 1}`;
  $("detail-main-photo").classList.remove("hidden");
  $("detail-no-photo").classList.add("hidden");
  $("photo-count").textContent = `${galleryIndex + 1} / ${total}`;

  $("photo-prev").classList.toggle("hidden", total < 2);
  $("photo-next").classList.toggle("hidden", total < 2);

  document.querySelectorAll("[data-thumb]").forEach(button => {
    button.classList.toggle("selected", Number(button.dataset.thumb) === galleryIndex);
  });
}

function closeProduct() {
  $("product-modal").classList.add("hidden");
  $("product-modal").setAttribute("aria-hidden", "true");
}

$("photo-prev").onclick = () => showPhoto(galleryIndex - 1);
$("photo-next").onclick = () => showPhoto(galleryIndex + 1);

document.querySelectorAll("[data-product-close]").forEach(button => {
  button.onclick = closeProduct;
});

document.addEventListener("keydown", event => {
  if ($("product-modal") && !$("product-modal").classList.contains("hidden")) {
    if (event.key === "Escape") closeProduct();
    if (event.key === "ArrowLeft") showPhoto(galleryIndex - 1);
    if (event.key === "ArrowRight") showPhoto(galleryIndex + 1);
  }
});

async function load() {
  try {
    const snapshot = await getDocs(ref);
    products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  } catch (error) {
    console.error(error);
    $("status").textContent = "Could not load products. Check Firebase Firestore rules.";
  }
}

async function loadBanner() {
  try {
    const snapshot = await getDoc(settings);
    if (snapshot.exists() && snapshot.data().saleBanner) {
      $("banner").textContent = "✨ " + snapshot.data().saleBanner;
      $("banner-input").value = snapshot.data().saleBanner;
    }
  } catch (error) {
    console.warn(error);
  }
}

$("year").textContent = new Date().getFullYear();
$("search").oninput = render;
$("category").onchange = render;
$("sort").onchange = render;

$("admin-open").onclick = () => $("modal").classList.remove("hidden");

document.querySelectorAll("[data-close]").forEach(element => {
  element.onclick = () => $("modal").classList.add("hidden");
});

$("login").onsubmit = async event => {
  event.preventDefault();
  $("message").textContent = "Signing in…";

  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
  } catch (error) {
    console.error(error);
    $("message").textContent = "Login failed. Check credentials and Email/Password in Firebase Authentication.";
  }
};

onAuthStateChanged(auth, currentUser => {
  user = currentUser;
  $("admin").classList.toggle("hidden", !currentUser);
  $("login").classList.toggle("hidden", !!currentUser);
  if (currentUser) adminList();
});

$("logout").onclick = async () => {
  await signOut(auth);
  toast("Logged out securely");
};

function reset() {
  $("editor").reset();
  $("pid").value = "";
  $("price").value = 0;
  $("stock").value = 0;
  $("discount").value = 0;
  $("active").checked = true;
  $("cancel").classList.add("hidden");
  $("image-files").value = "";
  $("upload-status").textContent = "Direct uploads require Cloudinary configuration. Existing image URLs can still be used.";
}

$("cancel").onclick = reset;

// Direct gallery-to-Cloudinary upload, once the cloud name and unsigned preset are configured.
$("image-files").onchange = async event => {
  const files = [...(event.target.files || [])];
  if (!files.length) return;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    $("upload-status").textContent =
      "Cloudinary setup is incomplete. Add your Cloud Name and Unsigned Upload Preset in app.js before uploading.";
    toast("Cloudinary configuration is still needed.");
    event.target.value = "";
    return;
  }

  const existing = $("images").value.split(/\n/).map(s => safeUrl(s.trim())).filter(Boolean);
  if (existing.length + files.length > 10) {
    toast("Maximum 10 photos per product, including existing photos.");
    event.target.value = "";
    return;
  }

  for (const file of files) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast("Choose JPG, PNG or WEBP images.");
      event.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast("Each photo must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }
  }

  const input = event.target;
  input.disabled = true;

  let uploaded = 0;
  const urls = [...existing];

  try {
    for (const file of files) {
      $("upload-status").textContent = `Uploading ${uploaded + 1} of ${files.length}: ${file.name}`;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", "home-appliances-products");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}/image/upload`,
        { method: "POST", body: formData }
      );

      const result = await response.json();

      if (!response.ok || !result.secure_url) {
        throw new Error(result.error?.message || "Cloudinary upload failed.");
      }

      urls.push(result.secure_url);
      uploaded++;
      $("images").value = urls.join("\n");
    }

    $("upload-status").textContent = `${uploaded} photo(s) uploaded. Save the product to keep these URLs in its record.`;
    toast("Photos uploaded. Now save the product.");
  } catch (error) {
    console.error(error);
    $("upload-status").textContent = `Upload error: ${error.message}`;
    toast("Some photos may not have uploaded. Check the message.");
  } finally {
    input.disabled = false;
    input.value = "";
  }
};

$("editor").onsubmit = async event => {
  event.preventDefault();
  if (!user) return;

  const id = $("pid").value || "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  const images = [...new Set(
    $("images").value.split(/\n/).map(s => safeUrl(s.trim())).filter(Boolean)
  )].slice(0, 10);

  const data = {
    name: $("name").value.trim(),
    category: $("cat").value,
    description: $("desc").value.trim(),
    price: Math.max(0, Number($("price").value)),
    stock: Math.max(0, Math.floor(Number($("stock").value))),
    images,
    saleOn: $("sale").checked,
    discountType: $("dtype").value,
    discount: Math.max(0, Number($("discount").value)),
    active: $("active").checked,
    updatedAt: new Date().toISOString()
  };

  if (!data.name) return toast("Enter a product name.");
  if (data.discountType === "percent") data.discount = Math.min(100, data.discount);

  try {
    await setDoc(doc(db, "products", id), data, { merge: true });
    toast("Product saved to Firebase!");
    reset();
    await load();
    await adminList();
  } catch (error) {
    console.error(error);
    toast("Save failed. Check Firestore rules and admin access.");
  }
};

async function adminList() {
  if (!user) return;

  try {
    const snapshot = await getDocs(ref);
    const rows = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    $("admin-list").innerHTML = rows.length
      ? rows.map(p => `
        <div class="admin-row">
          <div>
            <b>${esc(p.name)}</b>
            <small>${money(p.price)} · Stock ${Number(p.stock || 0)} · ${getImages(p).length} photos</small>
          </div>
          <div>
            <button class="btn ghost edit" data-id="${esc(p.id)}" type="button">Edit</button>
            <button class="btn ghost del" data-id="${esc(p.id)}" type="button">Delete</button>
          </div>
        </div>`).join("")
      : '<p class="muted">No products yet.</p>';

    document.querySelectorAll(".edit").forEach(button => {
      button.onclick = () => {
        const product = rows.find(p => p.id === button.dataset.id);
        if (!product) return;

        $("pid").value = product.id;
        $("name").value = product.name || "";
        $("cat").value = product.category || "Other";
        $("desc").value = product.description || "";
        $("price").value = product.price || 0;
        $("stock").value = product.stock || 0;
        $("images").value = getImages(product).join("\n");
        $("sale").checked = !!product.saleOn;
        $("dtype").value = product.discountType || "percent";
        $("discount").value = product.discount || 0;
        $("active").checked = product.active !== false;
        $("cancel").classList.remove("hidden");
        $("upload-status").textContent = "Existing photo URLs are loaded. You can add more photos.";
        $("editor").scrollIntoView({ behavior: "smooth" });
      };
    });

    document.querySelectorAll(".del").forEach(button => {
      button.onclick = async () => {
        const product = rows.find(p => p.id === button.dataset.id);
        if (product && confirm(`Delete ${product.name}?`)) {
          try {
            await deleteDoc(doc(db, "products", product.id));
            toast("Product deleted");
            await load();
            await adminList();
          } catch (error) {
            console.error(error);
            toast("Delete failed; check Firestore rules.");
          }
        }
      };
    });
  } catch (error) {
    console.error(error);
    $("admin-list").textContent = "Could not load products. Check Firestore rules.";
  }
}

$("banner-form").onsubmit = async event => {
  event.preventDefault();

  try {
    const saleBanner = $("banner-input").value.trim();
    await setDoc(settings, { saleBanner, updatedAt: new Date().toISOString() }, { merge: true });
    $("banner").textContent = "✨ " + saleBanner;
    toast("Banner updated");
  } catch (error) {
    console.error(error);
    toast("Banner update failed; check rules.");
  }
};

await load();
await loadBanner();
