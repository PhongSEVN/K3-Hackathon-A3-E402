// Mirrors backend/app/ml/disease_labels.py — kept in sync manually since it's
// a static, rarely-changing 25-class list. Used to populate the chuyên gia's
// diagnosis dropdown in ExpertApp.tsx with the exact label keys the backend
// (and the retrain gold-set folder layout) expects.
export const IRRELEVANT_LABEL = '_khong_lien_quan';

export const DISEASE_CLASS_OPTIONS: { value: string; label: string }[] = [
  { value: 'Cafe_benh_dom_rong', label: 'Cà phê — đốm rong' },
  { value: 'Cafe_benh_nam_ri_sat', label: 'Cà phê — nấm rỉ sắt' },
  { value: 'Cafe_benh_phan_trang', label: 'Cà phê — phấn trắng' },
  { value: 'Cafe_benh_phoma', label: 'Cà phê — phoma' },
  { value: 'Cafe_benh_sau_ve_bua', label: 'Cà phê — sâu vẽ bùa' },
  { value: 'Cafe_khoe_manh', label: 'Cà phê — khỏe mạnh' },
  { value: 'Lua_benh_dao_on_co_bong', label: 'Lúa — đạo ôn cổ bông' },
  { value: 'Lua_benh_dao_on_la', label: 'Lúa — đạo ôn lá' },
  { value: 'Lua_benh_dom_nau', label: 'Lúa — đốm nâu' },
  { value: 'Lua_benh_sau_gai_hispa', label: 'Lúa — sâu gai hispa' },
  { value: 'Lua_benh_vang_la_tungro', label: 'Lúa — vàng lá tungro' },
  { value: 'Lua_khoe_manh', label: 'Lúa — khỏe mạnh' },
  { value: 'Mia_benh_choi_co', label: 'Mía — chồi cỏ' },
  { value: 'Mia_benh_dom_nau', label: 'Mía — đốm nâu' },
  { value: 'Mia_benh_kham_la', label: 'Mía — khảm lá' },
  { value: 'Mia_benh_ri_sat_nau', label: 'Mía — rỉ sắt nâu' },
  { value: 'Mia_benh_than_den', label: 'Mía — than đen' },
  { value: 'Mia_benh_thoi_hom', label: 'Mía — thối hom' },
  { value: 'Mia_benh_vang_la', label: 'Mía — vàng lá' },
  { value: 'Mia_khoe_manh', label: 'Mía — khỏe mạnh' },
  { value: 'Mia_la_kho', label: 'Mía — lá khô' },
  { value: 'Ngo_benh_chay_la_lon', label: 'Ngô — cháy lá lớn' },
  { value: 'Ngo_benh_dom_la_xam', label: 'Ngô — đốm lá xám' },
  { value: 'Ngo_benh_ri_sat', label: 'Ngô — rỉ sắt' },
  { value: 'Ngo_khoe_manh', label: 'Ngô — khỏe mạnh' },
];
