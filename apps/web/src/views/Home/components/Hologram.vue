<template>
    <canvas
        ref="hologramRef"
        class="block h-[250px] w-[500px] transition-opacity duration-300"
        :class="isReady ? 'opacity-100 visible' : 'opacity-0 invisible'"
    />
</template>

<script setup lang="ts">
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

const hologramRef = useTemplateRef<HTMLCanvasElement>('hologramRef')
const isReady = ref(false)
let animationFrameId = 0
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let currentScene: THREE.Scene | null = null
let disposed = false

const disposeMaterial = (material: THREE.Material | THREE.Material[]) => {
    const materials = Array.isArray(material) ? material : [material]
    materials.forEach(item => item.dispose())
}

const disposeScene = (scene: THREE.Object3D) => {
    scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return
        object.geometry.dispose()
        disposeMaterial(object.material)
    })
}

const initThree = () => {
    const canvas = hologramRef.value
    if (!canvas) return

    const scene = new THREE.Scene()
    currentScene = scene
    const clock = new THREE.Timer()
    let mixer: THREE.AnimationMixer | null = null

    const camera = new THREE.PerspectiveCamera(75, 2, 0.1, 1000)
    camera.position.set(0, 0, 10)

    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        precision: 'highp',
        powerPreference: 'high-performance',
        premultipliedAlpha: false,
    })
    renderer.setSize(500, 250)
    renderer.setClearColor(0x000000, 0)

    controls = new OrbitControls(camera, renderer.domElement)
    scene.add(new THREE.AmbientLight(0xffffff, 1))

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2)
    directionalLight.position.set(5, 10, 7.5)
    scene.add(directionalLight)

    const render = () => {
        mixer?.update(clock.getDelta())
        scene.rotation.y += 0.002
        controls?.update()
        renderer?.render(scene, camera)
    }

    new GLTFLoader().load('/models/hologram/scene.gltf', (gltf) => {
        if (disposed) {
            disposeScene(gltf.scene)
            return
        }

        scene.add(gltf.scene)
        gltf.scene.scale.set(4, 4, 4)

        if (gltf.animations.length) {
            mixer = new THREE.AnimationMixer(gltf.scene)
            gltf.animations.forEach(clip => mixer?.clipAction(clip).play())
        }

        render()
        requestAnimationFrame(() => {
            if (!disposed) {
                isReady.value = true
                animate()
            }
        })
    })

    const animate = () => {
        animationFrameId = requestAnimationFrame(animate)
        render()
    }
}

onMounted(initThree)

onBeforeUnmount(() => {
    cancelAnimationFrame(animationFrameId)
    disposed = true
    controls?.dispose()
    if (currentScene) disposeScene(currentScene)
    renderer?.dispose()
    renderer = null
    controls = null
    currentScene = null
})
</script>
