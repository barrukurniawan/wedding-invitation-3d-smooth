export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png","models/pemandu.gltf","models/pengantin-pria.gltf","models/pengantin-wanita.gltf","models/resepsionis.gltf","models/tamu.gltf","nature/gltf/Bark_DeadTree.png","nature/gltf/Bark_DeadTree_Normal.png","nature/gltf/Bark_NormalTree.png","nature/gltf/Bark_NormalTree_Normal.png","nature/gltf/Bark_TwistedTree.png","nature/gltf/Bark_TwistedTree_Normal.png","nature/gltf/Bush_Common.bin","nature/gltf/Bush_Common.gltf","nature/gltf/Bush_Common_Flowers.bin","nature/gltf/Bush_Common_Flowers.gltf","nature/gltf/Clover_1.bin","nature/gltf/Clover_1.gltf","nature/gltf/Clover_2.bin","nature/gltf/Clover_2.gltf","nature/gltf/CommonTree_1.bin","nature/gltf/CommonTree_1.gltf","nature/gltf/CommonTree_2.bin","nature/gltf/CommonTree_2.gltf","nature/gltf/CommonTree_3.bin","nature/gltf/CommonTree_3.gltf","nature/gltf/CommonTree_4.bin","nature/gltf/CommonTree_4.gltf","nature/gltf/CommonTree_5.bin","nature/gltf/CommonTree_5.gltf","nature/gltf/DeadTree_1.bin","nature/gltf/DeadTree_1.gltf","nature/gltf/DeadTree_2.bin","nature/gltf/DeadTree_2.gltf","nature/gltf/DeadTree_3.bin","nature/gltf/DeadTree_3.gltf","nature/gltf/Fern_1.bin","nature/gltf/Fern_1.gltf","nature/gltf/Flower_3_Group.bin","nature/gltf/Flower_3_Group.gltf","nature/gltf/Flower_3_Single.bin","nature/gltf/Flower_3_Single.gltf","nature/gltf/Flower_4_Group.bin","nature/gltf/Flower_4_Group.gltf","nature/gltf/Flower_4_Single.bin","nature/gltf/Flower_4_Single.gltf","nature/gltf/Flowers.png","nature/gltf/Grass.png","nature/gltf/Grass_Common_Short.bin","nature/gltf/Grass_Common_Short.gltf","nature/gltf/Grass_Common_Tall.bin","nature/gltf/Grass_Common_Tall.gltf","nature/gltf/Grass_Wispy_Short.bin","nature/gltf/Grass_Wispy_Short.gltf","nature/gltf/Grass_Wispy_Tall.bin","nature/gltf/Grass_Wispy_Tall.gltf","nature/gltf/Leaf_Pine.png","nature/gltf/Leaf_Pine_C.png","nature/gltf/Leaves.png","nature/gltf/Leaves_GiantPine_C.png","nature/gltf/Leaves_NormalTree.png","nature/gltf/Leaves_NormalTree_C.png","nature/gltf/Leaves_TwistedTree.png","nature/gltf/Leaves_TwistedTree_C.png","nature/gltf/Mushroom_Common.bin","nature/gltf/Mushroom_Common.gltf","nature/gltf/Mushroom_Laetiporus.bin","nature/gltf/Mushroom_Laetiporus.gltf","nature/gltf/Mushrooms.png","nature/gltf/PathRocks_Diffuse.png","nature/gltf/Pebble_Round_1.bin","nature/gltf/Pebble_Round_1.gltf","nature/gltf/Pebble_Round_2.bin","nature/gltf/Pebble_Round_2.gltf","nature/gltf/Pebble_Round_3.bin","nature/gltf/Pebble_Round_3.gltf","nature/gltf/Pebble_Square_1.bin","nature/gltf/Pebble_Square_1.gltf","nature/gltf/Pebble_Square_2.bin","nature/gltf/Pebble_Square_2.gltf","nature/gltf/Pebble_Square_3.bin","nature/gltf/Pebble_Square_3.gltf","nature/gltf/Pine_1.bin","nature/gltf/Pine_1.gltf","nature/gltf/Pine_2.bin","nature/gltf/Pine_2.gltf","nature/gltf/Pine_3.bin","nature/gltf/Pine_3.gltf","nature/gltf/Pine_4.bin","nature/gltf/Pine_4.gltf","nature/gltf/Pine_5.bin","nature/gltf/Pine_5.gltf","nature/gltf/Plant_1.bin","nature/gltf/Plant_1.gltf","nature/gltf/Plant_1_Big.bin","nature/gltf/Plant_1_Big.gltf","nature/gltf/RockPath_Round_Small_1.bin","nature/gltf/RockPath_Round_Small_1.gltf","nature/gltf/RockPath_Round_Small_2.bin","nature/gltf/RockPath_Round_Small_2.gltf","nature/gltf/RockPath_Square_Small_1.bin","nature/gltf/RockPath_Square_Small_1.gltf","nature/gltf/RockPath_Square_Wide.bin","nature/gltf/RockPath_Square_Wide.gltf","nature/gltf/Rock_Medium_1.bin","nature/gltf/Rock_Medium_1.gltf","nature/gltf/Rock_Medium_2.bin","nature/gltf/Rock_Medium_2.gltf","nature/gltf/Rock_Medium_3.bin","nature/gltf/Rock_Medium_3.gltf","nature/gltf/Rocks_Desert_Diffuse.png","nature/gltf/Rocks_Diffuse.png","nature/gltf/TwistedTree_1.bin","nature/gltf/TwistedTree_1.gltf","nature/gltf/TwistedTree_2.bin","nature/gltf/TwistedTree_2.gltf","nature/gltf/TwistedTree_3.bin","nature/gltf/TwistedTree_3.gltf","nature/gltf/TwistedTree_4.bin","nature/gltf/TwistedTree_4.gltf","nature/gltf/TwistedTree_5.bin","nature/gltf/TwistedTree_5.gltf"]),
	mimeTypes: {".png":"image/png",".gltf":"model/gltf+json",".bin":"application/octet-stream"},
	_: {
		client: {start:"_app/immutable/entry/start.BWeZNWmH.js",app:"_app/immutable/entry/app.BJ4YUSJH.js",imports:["_app/immutable/entry/start.BWeZNWmH.js","_app/immutable/chunks/BwaUWNhp.js","_app/immutable/chunks/DGHn6Kn7.js","_app/immutable/chunks/otLc8NVL.js","_app/immutable/entry/app.BJ4YUSJH.js","_app/immutable/chunks/DGHn6Kn7.js","_app/immutable/chunks/CThk_J-c.js","_app/immutable/chunks/yEYfFR0w.js","_app/immutable/chunks/otLc8NVL.js","_app/immutable/chunks/DHVvIFcW.js","_app/immutable/chunks/CjWdXhSf.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
