DISEASE_LABELS: dict[str, tuple[str, str]] = {
    "Cafe_benh_dom_rong": ("cà phê", "đốm rong"),
    "Cafe_benh_nam_ri_sat": ("cà phê", "nấm rỉ sắt"),
    "Cafe_benh_phan_trang": ("cà phê", "phấn trắng"),
    "Cafe_benh_phoma": ("cà phê", "phoma"),
    "Cafe_benh_sau_ve_bua": ("cà phê", "sâu vẽ bùa"),
    "Cafe_khoe_manh": ("cà phê", ""),
    "Lua_benh_dao_on_co_bong": ("lúa", "đạo ôn cổ bông"),
    "Lua_benh_dao_on_la": ("lúa", "đạo ôn lá"),
    "Lua_benh_dom_nau": ("lúa", "đốm nâu"),
    "Lua_benh_sau_gai_hispa": ("lúa", "sâu gai hispa"),
    "Lua_benh_vang_la_tungro": ("lúa", "vàng lá tungro"),
    "Lua_khoe_manh": ("lúa", ""),
    "Mia_benh_choi_co": ("mía", "chồi cỏ"),
    "Mia_benh_dom_nau": ("mía", "đốm nâu"),
    "Mia_benh_kham_la": ("mía", "khảm lá"),
    "Mia_benh_ri_sat_nau": ("mía", "rỉ sắt nâu"),
    "Mia_benh_than_den": ("mía", "than đen"),
    "Mia_benh_thoi_hom": ("mía", "thối hom"),
    "Mia_benh_vang_la": ("mía", "vàng lá"),
    "Mia_khoe_manh": ("mía", ""),
    "Mia_la_kho": ("mía", "lá khô"),
    "Ngo_benh_chay_la_lon": ("ngô", "cháy lá lớn"),
    "Ngo_benh_dom_la_xam": ("ngô", "đốm lá xám"),
    "Ngo_benh_ri_sat": ("ngô", "rỉ sắt"),
    "Ngo_khoe_manh": ("ngô", ""),
}


def describe_label(label: str) -> str:
    crop, disease = DISEASE_LABELS.get(label, ("", label.replace("_", " ")))

    if not disease:
        if crop:
            return f"Cây {crop} có vẻ khỏe mạnh, không phát hiện dấu hiệu bệnh."
        return "Không phát hiện dấu hiệu bệnh rõ ràng."

    if crop:
        return f"Cây {crop} có dấu hiệu bệnh {disease}."
    return f"Có dấu hiệu bệnh {disease}."
