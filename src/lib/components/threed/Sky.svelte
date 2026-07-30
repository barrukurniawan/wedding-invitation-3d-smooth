<script lang="ts">
  import * as THREE from 'three'
  import { T } from '@threlte/core'
  import { onDestroy, untrack } from 'svelte'

  let { lowPower = false }: { lowPower?: boolean } = $props()
  const resolvedLowPower = untrack(() => lowPower)

  const skyGeometry = new THREE.SphereGeometry(92, resolvedLowPower ? 20 : 32, resolvedLowPower ? 12 : 18)
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      horizonColor: { value: new THREE.Color('#eaf8ff') },
      skyColor: { value: new THREE.Color('#8ed3f7') }
    },
    vertexShader: `
      varying float vHeight;

      void main() {
        vHeight = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 horizonColor;
      uniform vec3 skyColor;
      varying float vHeight;

      void main() {
        float gradient = smoothstep(-0.12, 0.78, vHeight);
        gl_FragColor = vec4(mix(horizonColor, skyColor, gradient), 1.0);
      }
    `
  })
  skyMaterial.toneMapped = false

  const sky = new THREE.Mesh(skyGeometry, skyMaterial)
  sky.name = 'gradient-sky'
  sky.frustumCulled = false
  sky.renderOrder = -100

  onDestroy(() => {
    skyGeometry.dispose()
    skyMaterial.dispose()
  })
</script>

<T is={sky} />
