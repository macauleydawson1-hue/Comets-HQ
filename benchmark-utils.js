/* Shared benchmark definitions. Durations are stored as seconds; reps as integers. */
(()=>{'use strict';
const types={
 bench_press:{label:'Bench working set',unit:'kg',higher:true},squat:{label:'Squat working set',unit:'kg',higher:true},trap_bar:{label:'Trap-bar working set',unit:'kg',higher:true},
 bronco:{label:'Bronco',unit:'time',higher:false},sprint_100m:{label:'100 m sprint',unit:'seconds',higher:false},pushups_1min:{label:'Push-ups (1 min)',unit:'reps',higher:true},plank:{label:'Plank',unit:'time',higher:true},situps_1min:{label:'Sit-ups (1 min)',unit:'reps',higher:true}
};
function parse(type,input){const config=types[type];if(!config)throw new Error('Choose a benchmark.');const text=String(input).trim();let number;
 if(config.unit==='time'&&text.includes(':')){const match=/^(\d{1,3}):([0-5]\d)(?:\.(\d{1,2}))?$/.exec(text);if(!match)throw new Error('Enter time as minutes:seconds, for example 5:30.');number=Number(match[1])*60+Number(match[2])+Number('0.'+(match[3]||'0'))}
 else{if(!/^\d+(?:\.\d{1,2})?$/.test(text))throw new Error('Enter a positive result with at most two decimal places.');number=Number(text)}
 if(!Number.isFinite(number)||number>86400||number<(config.unit==='reps'?0:0.01)||(config.unit==='reps'&&!Number.isInteger(number)))throw new Error(config.unit==='reps'?'Enter a whole-number repetition count of zero or more.':'Enter a result greater than zero.');
 return number;
}
function inputValue(type,value){if(types[type]?.unit!=='time')return String(Number(value));const cents=Math.round(Number(value)*100),minutes=Math.floor(cents/6000),seconds=(cents%6000)/100;return minutes+':'+seconds.toFixed(cents%100?2:0).padStart(cents%100?5:2,'0')}
function format(type,value){const config=types[type];return config?.unit==='time'?inputValue(type,value):Number(value).toLocaleString('en-AU',{maximumFractionDigits:2})+' '+(config?.unit||'')}
const api={types,parse,inputValue,format};globalThis.CometsBenchmarks=api;if(typeof module!=='undefined')module.exports=api;
})();
