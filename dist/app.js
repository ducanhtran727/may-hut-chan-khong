let pendingRequest = null;
const form = document.querySelector("#order-form");
const packages = {
  single: { label: "1 máy + 10 túi", price: 339000, quantity: 1 },
  double: { label: "2 máy + 20 túi", price: 599000, quantity: 2 },
};
const money = (value) => new Intl.NumberFormat("vi-VN").format(value) + "₫";
const selection = () => {
  const packageId = form.elements.packageId.value;
  return {
    packageId,
    bagsId: "none",
    quantity: packages[packageId].quantity,
    total: packages[packageId].price,
  };
};
const updateTotal = () => {
  document.querySelector("#order-total").textContent = money(selection().total);
};
form.addEventListener("change", updateTotal);
for (const name of ["name", "phone", "address"]) {
  document.querySelector(`#${name}`).addEventListener("input", (event) => {
    event.target.removeAttribute("aria-invalid");
    document.querySelector(`#${name}-error`).textContent = "";
  });
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = form.elements.name.value.trim();
  const address = form.elements.address.value.trim();
  const rawPhone = form.elements.phone.value.trim();
  const phone = rawPhone.replace(/[\s.()-]/g, "");
  const errors = {
    address:
      address.length < 10 || address.length > 500
        ? "Vui lòng nhập địa chỉ từ 10 đến 500 ký tự."
        : "",
    name: name.length < 2 ? "Vui lòng nhập họ tên từ 2 ký tự." : "",
    phone: /^(?:0[35789]\d{8}|\+?84[35789]\d{8})$/.test(phone)
      ? ""
      : "Vui lòng nhập số điện thoại Việt Nam hợp lệ.",
  };
  let firstError;
  for (const [key, error] of Object.entries(errors)) {
    const input = form.elements[key];
    document.querySelector(`#${key}-error`).textContent = error;
    input.setAttribute("aria-describedby", `${key}-error`);
    input.setAttribute("aria-invalid", String(Boolean(error)));
    if (error && !firstError) firstError = input;
  }
  if (firstError) {
    firstError.focus();
    return;
  }
  const chosen = selection();
  const params = new URLSearchParams(location.search);
  const endpoint = window.LANDING_CONFIG?.googleSheetsEndpoint;
  if (endpoint) {
    const button = form.querySelector('[type="submit"]');
    const status = document.querySelector("#form-status");
    button.disabled = true;
    button.textContent = "Đang gửi yêu cầu…";
    status.textContent = "";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const values = {
        name,
        phone,
        address,
        packageId: chosen.packageId,
      };
      const fingerprint = JSON.stringify(values);
      if (!pendingRequest || pendingRequest.fingerprint !== fingerprint)
        pendingRequest = { fingerprint, id: crypto.randomUUID() };
      const payload = { ...values, requestId: pendingRequest.id };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true || result.requestId !== payload.requestId)
        throw new Error("Request not confirmed");
      status.textContent =
        "Cửa hàng đã nhận yêu cầu tư vấn. Đây chưa phải xác nhận đơn hàng; cửa hàng sẽ liên hệ theo thông tin bạn cung cấp.";
      pendingRequest = null;
      form.reset();
      updateTotal();
    } catch {
      status.textContent =
        "Chưa xác nhận được yêu cầu. Vui lòng thử lại hoặc liên hệ cửa hàng; thông tin bạn nhập vẫn được giữ nguyên.";
    } finally {
      clearTimeout(timer);
      button.disabled = false;
      button.innerHTML = "Gửi yêu cầu tư vấn <span>↗</span>";
    }
    return;
  }
  const attribution = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "utm_id",
  ]
    .filter((key) => params.has(key))
    .map((key) => `${key}: ${params.get(key)}`);
  const text = [
    "YÊU CẦU ĐẶT HÀNG — LIVINGHUB",
    "Trạng thái: CHƯA GỬI ĐẾN CỬA HÀNG",
    "",
    "Sản phẩm: Máy hút chân không thực phẩm",
    `Họ tên: ${name}`,
    `Điện thoại: ${rawPhone}`,
    `Địa chỉ: ${address}`,
    `Gói máy: ${packages[chosen.packageId].label}`,
    `Tổng dự kiến: ${money(chosen.total)} (miễn phí giao hàng)`,
    `Nhu cầu: ${form.elements.note.value.trim() || "Chưa ghi thêm"}`,
    "",
    "Giá theo trang nguồn; cửa hàng sẽ xác nhận lại yêu cầu trước khi xử lý.",
    "Tệp này được tạo trên thiết bị của bạn. Đây không phải xác nhận đơn hàng.",
    "",
    ...attribution,
  ].join("\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + text], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "livinghub-yeu-cau-dat-hang.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  document.querySelector("#form-status").textContent =
    "Đã tạo tệp yêu cầu để tải xuống. Thông tin chưa gửi đến cửa hàng và chưa tạo đơn hàng.";
});

if (window.LANDING_CONFIG?.googleSheetsEndpoint) {
  document.querySelector(".order-note p").textContent =
    "Gửi nhu cầu để cửa hàng liên hệ tư vấn và xác nhận mẫu máy, giá cùng chính sách bán hàng trước khi đặt mua.";
  document.querySelector(".form-privacy").textContent =
    "Thông tin được gửi đến cửa hàng để tư vấn theo yêu cầu của bạn. Không lưu thông tin cá nhân vào trình duyệt.";
  document.querySelector(".submit").innerHTML =
    "Gửi yêu cầu tư vấn <span>↗</span>";
}

const reviewDialog = document.querySelector("#review-lightbox");
for (const button of document.querySelectorAll("[data-review-view]")) {
  button.addEventListener("click", () => {
    const photos = button.dataset.reviewView === "photos";
    document.querySelector("#review-comments").hidden = photos;
    document.querySelector("#review-photo-gallery").hidden = !photos;
    for (const tab of document.querySelectorAll("[data-review-view]")) {
      const active = tab === button;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-pressed", String(active));
    }
  });
}
for (const button of document.querySelectorAll("[data-review-image]")) {
  button.addEventListener("click", () => {
    const photo = reviewDialog.querySelector("img");
    photo.src = button.dataset.reviewImage;
    photo.alt = button.querySelector("img").alt;
    reviewDialog.showModal();
  });
}
reviewDialog
  .querySelector(".lightbox-close")
  .addEventListener("click", () => reviewDialog.close());
reviewDialog.addEventListener("click", (event) => {
  if (event.target === reviewDialog) reviewDialog.close();
});
for (const button of document.querySelectorAll(".review-helpful")) {
  button.addEventListener("click", () => {
    const active = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(active));
    button.textContent = active ? "♥ Đã đánh dấu hữu ích" : "♡ Hữu ích";
  });
}
