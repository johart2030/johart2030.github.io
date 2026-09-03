const Appearance={
 key:'hst_appearance',defaults:{theme:'system',accent:'blue',density:'comfortable'},
 load(){try{return {...this.defaults,...JSON.parse(localStorage.getItem(this.key)||'{}')}}catch{return {...this.defaults}}},
 apply(value=this.load()){const root=document.documentElement;root.dataset.theme=value.theme;root.dataset.accent=value.accent;root.dataset.density=value.density;root.style.colorScheme=value.theme==='system'?'light dark':value.theme;this.current=value;window.dispatchEvent(new CustomEvent('hst:appearance',{detail:value}))},
 save(value){localStorage.setItem(this.key,JSON.stringify(value));this.apply(value)}
};window.Appearance=Appearance;Appearance.apply();
