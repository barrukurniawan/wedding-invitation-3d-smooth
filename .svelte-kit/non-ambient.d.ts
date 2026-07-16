
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>
		};
		Pathname(): "/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.png" | "/models/pemandu.gltf" | "/models/pengantin-pria.gltf" | "/models/pengantin-wanita.gltf" | "/models/resepsionis.gltf" | "/models/tamu.gltf" | "/nature/gltf/Bark_DeadTree.png" | "/nature/gltf/Bark_DeadTree_Normal.png" | "/nature/gltf/Bark_NormalTree.png" | "/nature/gltf/Bark_NormalTree_Normal.png" | "/nature/gltf/Bark_TwistedTree.png" | "/nature/gltf/Bark_TwistedTree_Normal.png" | "/nature/gltf/Bush_Common.bin" | "/nature/gltf/Bush_Common.gltf" | "/nature/gltf/Bush_Common_Flowers.bin" | "/nature/gltf/Bush_Common_Flowers.gltf" | "/nature/gltf/Clover_1.bin" | "/nature/gltf/Clover_1.gltf" | "/nature/gltf/Clover_2.bin" | "/nature/gltf/Clover_2.gltf" | "/nature/gltf/CommonTree_1.bin" | "/nature/gltf/CommonTree_1.gltf" | "/nature/gltf/CommonTree_2.bin" | "/nature/gltf/CommonTree_2.gltf" | "/nature/gltf/CommonTree_3.bin" | "/nature/gltf/CommonTree_3.gltf" | "/nature/gltf/CommonTree_4.bin" | "/nature/gltf/CommonTree_4.gltf" | "/nature/gltf/CommonTree_5.bin" | "/nature/gltf/CommonTree_5.gltf" | "/nature/gltf/DeadTree_1.bin" | "/nature/gltf/DeadTree_1.gltf" | "/nature/gltf/DeadTree_2.bin" | "/nature/gltf/DeadTree_2.gltf" | "/nature/gltf/DeadTree_3.bin" | "/nature/gltf/DeadTree_3.gltf" | "/nature/gltf/Fern_1.bin" | "/nature/gltf/Fern_1.gltf" | "/nature/gltf/Flower_3_Group.bin" | "/nature/gltf/Flower_3_Group.gltf" | "/nature/gltf/Flower_3_Single.bin" | "/nature/gltf/Flower_3_Single.gltf" | "/nature/gltf/Flower_4_Group.bin" | "/nature/gltf/Flower_4_Group.gltf" | "/nature/gltf/Flower_4_Single.bin" | "/nature/gltf/Flower_4_Single.gltf" | "/nature/gltf/Flowers.png" | "/nature/gltf/Grass.png" | "/nature/gltf/Grass_Common_Short.bin" | "/nature/gltf/Grass_Common_Short.gltf" | "/nature/gltf/Grass_Common_Tall.bin" | "/nature/gltf/Grass_Common_Tall.gltf" | "/nature/gltf/Grass_Wispy_Short.bin" | "/nature/gltf/Grass_Wispy_Short.gltf" | "/nature/gltf/Grass_Wispy_Tall.bin" | "/nature/gltf/Grass_Wispy_Tall.gltf" | "/nature/gltf/Leaf_Pine.png" | "/nature/gltf/Leaf_Pine_C.png" | "/nature/gltf/Leaves.png" | "/nature/gltf/Leaves_GiantPine_C.png" | "/nature/gltf/Leaves_NormalTree.png" | "/nature/gltf/Leaves_NormalTree_C.png" | "/nature/gltf/Leaves_TwistedTree.png" | "/nature/gltf/Leaves_TwistedTree_C.png" | "/nature/gltf/Mushroom_Common.bin" | "/nature/gltf/Mushroom_Common.gltf" | "/nature/gltf/Mushroom_Laetiporus.bin" | "/nature/gltf/Mushroom_Laetiporus.gltf" | "/nature/gltf/Mushrooms.png" | "/nature/gltf/PathRocks_Diffuse.png" | "/nature/gltf/Pebble_Round_1.bin" | "/nature/gltf/Pebble_Round_1.gltf" | "/nature/gltf/Pebble_Round_2.bin" | "/nature/gltf/Pebble_Round_2.gltf" | "/nature/gltf/Pebble_Round_3.bin" | "/nature/gltf/Pebble_Round_3.gltf" | "/nature/gltf/Pebble_Square_1.bin" | "/nature/gltf/Pebble_Square_1.gltf" | "/nature/gltf/Pebble_Square_2.bin" | "/nature/gltf/Pebble_Square_2.gltf" | "/nature/gltf/Pebble_Square_3.bin" | "/nature/gltf/Pebble_Square_3.gltf" | "/nature/gltf/Pine_1.bin" | "/nature/gltf/Pine_1.gltf" | "/nature/gltf/Pine_2.bin" | "/nature/gltf/Pine_2.gltf" | "/nature/gltf/Pine_3.bin" | "/nature/gltf/Pine_3.gltf" | "/nature/gltf/Pine_4.bin" | "/nature/gltf/Pine_4.gltf" | "/nature/gltf/Pine_5.bin" | "/nature/gltf/Pine_5.gltf" | "/nature/gltf/Plant_1.bin" | "/nature/gltf/Plant_1.gltf" | "/nature/gltf/Plant_1_Big.bin" | "/nature/gltf/Plant_1_Big.gltf" | "/nature/gltf/RockPath_Round_Small_1.bin" | "/nature/gltf/RockPath_Round_Small_1.gltf" | "/nature/gltf/RockPath_Round_Small_2.bin" | "/nature/gltf/RockPath_Round_Small_2.gltf" | "/nature/gltf/RockPath_Square_Small_1.bin" | "/nature/gltf/RockPath_Square_Small_1.gltf" | "/nature/gltf/RockPath_Square_Wide.bin" | "/nature/gltf/RockPath_Square_Wide.gltf" | "/nature/gltf/Rock_Medium_1.bin" | "/nature/gltf/Rock_Medium_1.gltf" | "/nature/gltf/Rock_Medium_2.bin" | "/nature/gltf/Rock_Medium_2.gltf" | "/nature/gltf/Rock_Medium_3.bin" | "/nature/gltf/Rock_Medium_3.gltf" | "/nature/gltf/Rocks_Desert_Diffuse.png" | "/nature/gltf/Rocks_Diffuse.png" | "/nature/gltf/TwistedTree_1.bin" | "/nature/gltf/TwistedTree_1.gltf" | "/nature/gltf/TwistedTree_2.bin" | "/nature/gltf/TwistedTree_2.gltf" | "/nature/gltf/TwistedTree_3.bin" | "/nature/gltf/TwistedTree_3.gltf" | "/nature/gltf/TwistedTree_4.bin" | "/nature/gltf/TwistedTree_4.gltf" | "/nature/gltf/TwistedTree_5.bin" | "/nature/gltf/TwistedTree_5.gltf" | string & {};
	}
}