const assert=require('node:assert/strict');const {youtubeId,youtubeReferenceId}=require('../video-utils.js');
const id='dQw4w9WgXcQ';
for(const url of [`https://youtube.com/watch?v=${id}`,`https://www.youtube.com/watch?v=${id}&t=15s`,`https://youtu.be/${id}?si=abc`,`https://m.youtube.com/watch?v=${id}`,`https://youtube.com/shorts/${id}`,`https://youtube.com/live/${id}`,`https://www.youtube-nocookie.com/embed/${id}`,`youtube.com/watch?v=${id}`])assert.equal(youtubeId(url),id,url);
for(const url of ['javascript:alert(1)',`https://youtube.com.evil.test/watch?v=${id}`,`https://evil.test/?v=${id}`,`https://youtube.com@evil.test/watch?v=${id}`,`https://user:password@youtube.com/watch?v=${id}`,`https://youtube.com:444/watch?v=${id}`,'https://youtube.com/playlist?list=abc','https://youtube.com/watch?v=bad','<iframe src="https://youtube.com"></iframe>'])assert.equal(youtubeId(url),null,url);
assert.equal(youtubeReferenceId(`user/youtube/${id}/12345678-1234-1234-1234-123456789012`),id);assert.equal(youtubeReferenceId('user/clip.mp4'),null);
console.log('PASS: YouTube link formats, strict host/ID validation and reference parsing.');
