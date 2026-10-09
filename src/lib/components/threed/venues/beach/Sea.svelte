<script lang="ts">
  // Laut toon yang mengelilingi pulau pasir: gradasi dangkal->dalam, garis ombak
  // yang bergerak, dan buih di keempat tepi pulau. Satu plane + shader murah; ikut kabut.
  import { T, useTask } from '@threlte/core'
  import * as THREE from 'three'
  import { onDestroy } from 'svelte'

  type Island = { minX: number; maxX: number; minZ: number; maxZ: number }

  let {
    island,
    shallow = '#5fc4c6',
    deep = '#2f7fae',
    foam = '#fff6e8'
  }: { island: Island; shallow?: string; deep?: string; foam?: string } = $props()

  // Cukup luas sampai tertutup kabut di segala arah; pasir menutupi bagian tengahnya.
  const SIZE = 320
  const geometry = new THREE.PlaneGeometry(SIZE, SIZE, 1, 1)
  geometry.rotateX(-Math.PI / 2)

  const material = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uIslandMin: { value: new THREE.Vector2() },
        uIslandMax: { value: new THREE.Vector2() },
        uShallow: { value: new THREE.Color() },
        uDeep: { value: new THREE.Color() },
        uFoam: { value: new THREE.Color() }
      }
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform float uTime;
      uniform vec2 uIslandMin;
      uniform vec2 uIslandMax;
      uniform vec3 uShallow;
      uniform vec3 uDeep;
      uniform vec3 uFoam;
      varying vec3 vWorld;
      void main() {
        // Jarak ke tepi pulau (persegi panjang): 0 di bibir pantai, makin jauh makin besar.
        vec2 outside = max(uIslandMin - vWorld.xz, vWorld.xz - uIslandMax);
        float dist = length(max(outside, 0.0)) + min(max(outside.x, outside.y), 0.0);
        vec3 color = mix(uShallow, uDeep, smoothstep(2.0, 30.0, dist));

        // Garis ombak bergelombang yang bergerak pelan ke arah pantai.
        float wave = dist * 0.32 + sin((vWorld.x + vWorld.z) * 0.18 + uTime * 0.5) * 0.7 - uTime * 0.35;
        float band = step(0.9, fract(wave));
        color = mix(color, uFoam, band * 0.35 * (1.0 - smoothstep(6.0, 40.0, dist)));

        // Buih di bibir pantai: tepinya maju-mundur seperti ombak pecah.
        float along = vWorld.x + vWorld.z;
        float edge = 1.0 + 0.45 * sin(uTime * 1.1 + along * 0.22) + 0.2 * sin(along * 0.7 - uTime * 0.6);
        float foamMask = 1.0 - smoothstep(edge - 0.25, edge, dist);
        color = mix(color, uFoam, foamMask * 0.9);

        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `
  })

  $effect(() => {
    material.uniforms.uIslandMin.value.set(island.minX, island.minZ)
    material.uniforms.uIslandMax.value.set(island.maxX, island.maxZ)
    material.uniforms.uShallow.value.set(shallow)
    material.uniforms.uDeep.value.set(deep)
    material.uniforms.uFoam.value.set(foam)
  })

  useTask((delta) => {
    material.uniforms.uTime.value += delta
  })

  onDestroy(() => {
    geometry.dispose()
    material.dispose()
  })
</script>

<T.Mesh {geometry} {material} position={[0, -0.07, 0]} name="beach-sea" />
