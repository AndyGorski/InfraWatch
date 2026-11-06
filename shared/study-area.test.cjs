// Geographic boundary cases: run with node shared/study-area.test.cjs.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/study-area.js','utf8'),sandbox);
const a=sandbox.window.InfraWatchArea,b=[0,0,2,2],hit=g=>a.geometryIntersectsBox(g,b);
assert(hit({type:'Point',coordinates:[2,2]}));
assert(!hit({type:'Point',coordinates:[3,1]}));
assert(hit({type:'LineString',coordinates:[[-1,1],[3,1]]}),'A crossing line has no vertex inside');
assert(!hit({type:'LineString',coordinates:[[-1,1.5],[1,3.5]]}),'Bounding rectangles overlap but the line misses the area');
assert(hit({type:'MultiLineString',coordinates:[[[4,4],[5,5]],[[-1,1],[3,1]]]}));
assert(hit({type:'Polygon',coordinates:[[[-1,-1],[3,-1],[3,3],[-1,3],[-1,-1]]]}),'Polygon contains the entire study area');
assert(!hit({type:'Polygon',coordinates:[[[-2,-2],[4,-2],[4,4],[-2,4],[-2,-2]],[[-1,-1],[3,-1],[3,3],[-1,3],[-1,-1]]]}),'Study area lies in a polygon hole');
assert(hit({type:'GeometryCollection',geometries:[{type:'Point',coordinates:[1,1]}]}));
for(const [lat,lon,w,h] of [[50.25,18.54,.1,.1],[51.65,21.46,10,10],[54.35,18.65,100,100]]){
 const box=a.boxFromDimensions(lat,lon,w,h),d=a.dimensions(box);
 assert(Math.abs(d.width_km-w)<1e-8&&Math.abs(d.height_km-h)<1e-8);
 assert(box[0]<lon&&box[2]>lon&&box[1]<lat&&box[3]>lat,'GeoJSON axis order is longitude, latitude');
}
for(const args of [[50,19,0,10],[50,19,101,10],[48,19,10,10],[50,30,10,10],[NaN,19,10,10]])assert.throws(()=>a.boxFromDimensions(...args));
assert.equal(a.coverage([.5,.5,1,1],b),'full');assert.equal(a.coverage([1,1,3,3],b),'partial');assert.equal(a.coverage([3,3,4,4],b),'none');
console.log('Study area: geometry, dimensions, validation and coverage cases passed.');
// Circle selection must use the geometry rather than its bbox or nearest vertex.
const centre=[19,51],line=(x,y)=>({type:'LineString',coordinates:[x,y]});
assert(a.distanceToGeometry(line([18.9,51],[19.1,51]),51,19)<10,'A line crossing the centre is nearby despite endpoints outside 1 km');
assert(a.distanceToGeometry({type:'Point',coordinates:[19.01,51.01]},51,19)>1000,'A point in a bounding-box corner lies outside a 1 km circle');
assert(Math.abs(a.pointDistance([19,51],[19,51.01])-1111.9493)<.1);
assert(a.distanceToGeometry(line([19.1,51],[19.2,51]),51,19)>6900,'Projection beyond segment uses its endpoint');
assert(a.distanceToGeometry(line([18.8,51],[18.9,51]),51,19)>6900,'Projection before segment uses its endpoint');
assert(a.distanceToGeometry({type:'MultiLineString',coordinates:[[[20,52],[21,52]],[[18.9,51],[19.1,51]]]},51,19)<10);
const shell=[[18.9,50.9],[19.1,50.9],[19.1,51.1],[18.9,51.1],[18.9,50.9]];
assert.equal(a.distanceToGeometry({type:'Polygon',coordinates:[shell]},51,19),0);
const hole=[[18.99,50.99],[19.01,50.99],[19.01,51.01],[18.99,51.01],[18.99,50.99]];
assert(a.distanceToGeometry({type:'Polygon',coordinates:[shell,hole]},51,19)>690,'A facility inside a hole has a positive distance to the polygon');
console.log('Facility radius: crossing lines, circle corners, endpoints, multi-geometries and polygon holes passed.');
