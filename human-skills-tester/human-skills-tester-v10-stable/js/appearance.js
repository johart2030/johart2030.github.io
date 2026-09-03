const Appearance={
 key:'hst_appearance_v2',
 defaults:{theme:'light',accent:'blue',density:'comfortable'},
 load(){try{const saved=JSON.parse(localStorage.getItem(this.key)||'{}');return {...this.defaults,...saved}}catch{return {...this.defaults}}},
 apply(value=this.load()){const safe={...this.defaults,...value},root=document.documentElement;root.dataset.theme=safe.theme;root.dataset.accent=safe.accent;root.dataset.density=safe.density;root.style.colorScheme=safe.theme==='dark'?'dark':'light';this.current=safe;window.dispatchEvent(new CustomEvent('hst:appearance',{detail:safe}));return safe},
 save(value){const safe={...this.defaults,...value};localStorage.setItem(this.key,JSON.stringify(safe));return this.apply(safe)},
 reset(){localStorage.removeItem(this.key);return this.apply(this.defaults)}
};window.Appearance=Appearance;Appearance.apply();
