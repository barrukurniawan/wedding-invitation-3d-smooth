<script lang="ts">
  // Laut toon di belakang pelaminan: gradasi dangkal->dalam, garis ombak yang
  // bergerak, dan buih di bibir pantai. Satu plane + shader murah; ikut kabut.
  import { T, useTask } from '@threlte/core'
  import * as THREE from 'three'
  import { onDestroy } from 'svelte'

  let {
    shoreZ = -25,
    shallow = '#5fc4c6',
    deep = '#2f7fae',
    foam = '#fff6e8'
  }: { shoreZ?: number; shallow?: string; deep?: string; foam?: string } = $props()

  const DEPTH = 100
  const WIDTH = 240
  const geometry = new THREE.PlaneGeometry(WIDTH, DEPTH, 1, 1)
  geometry.rotateX(-Math.PI / 2)
  // Mulai 1 m di bawah pasir supaya buih surut terlihat masuk ke bawah tepi pasir.
  geometry.translate(0, 0, -DEPTH / 2 + 1)

  const material = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uShoreZ: { value: 0 },
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
      uniform float uShoreZ;
      uniform vec3 uShallow;
      uniform vec3 uDeep;
      uniform vec3 uFoam;
      varying vec3 vWorld;
      void main() {
        float dist = uShoreZ - vWorld.z; // 0 di bibir pantai, makin jauh makin besar
        vec3 color = mix(uShallow, uDeep, smoothstep(2.0, 30.0, dist));

        // Garis ombak bergelombang yang bergerak pelan ke arah pantai.
        float wave = vWorld.z * 0.32 + sin(vWorld.x * 0.18 + uTime * 0.5) * 0.7 + uTime * 0.35;
        float band = step(0.9, fract(wave));
        color = mix(color, uFoam, band * 0.35 * (1.0 - smoothstep(6.0, 40.0, dist)));

        // Buih di bibir pantai: tepinya maju-mundur seperti ombak pecah.
        float edge = 1.4 + 0.55 * sin(uTime * 1.1 + vWorld.x * 0.22) + 0.25 * sin(vWorld.x * 0.7 - uTime * 0.6);
        float foamMask = 1.0 - smoothstep(edge - 0.25, edge, dist);
        color = mix(color, uFoam, foamMask * 0.9);

        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `
  })

  $effect(() => {
    material.uniforms.uShoreZ.value = shoreZ
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

<T.Mesh {geometry} {material} position={[0, -0.07, shoreZ]} name="beach-sea" />
