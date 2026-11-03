import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function createRenderPipeline(renderer,scene,camera){
  const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.55;room.dispose();pmrem.dispose();
  // Renderer antialiasing does not cover offscreen postprocessing by itself.
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:Math.min(4,renderer.capabilities.maxSamples||0)});
  const composer=new EffectComposer(renderer,target);
  // SSAO multiplies an existing color image; it does not draw the scene's colors.
  composer.addPass(new RenderPass(scene,camera));
  const ao=new SSAOPass(scene,camera,innerWidth,innerHeight,16);ao.kernelRadius=.28;ao.minDistance=.002;ao.maxDistance=.045;composer.addPass(ao);
  const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.16,.35,1.35);composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const fxaa=new ShaderPass(FXAAShader);composer.addPass(fxaa);
  const finish=new ShaderPass({
    uniforms:{tDiffuse:{value:null},time:{value:0}},
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
      void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;
      float l=dot(c,vec3(.2126,.7152,.0722));
      c=mix(vec3(l),c,1.035);c=(c-.5)*1.025+.5;
      c+=vec3(.009,.003,-.007)*smoothstep(.25,.9,l);
      vec2 p=(vUv-.5)*vec2(1.0,.8);c*=1.0-.16*smoothstep(.18,.72,length(p));
      gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);}`
  });composer.addPass(finish);
  let high=true;
  function resize(){
    composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight);
    const ratio=renderer.getPixelRatio();fxaa.uniforms.resolution.value.set(1/(innerWidth*ratio),1/(innerHeight*ratio));
  }
  resize();
  return {
    resize,
    quality(enabled){high=enabled;renderer.setPixelRatio(enabled?Math.min(devicePixelRatio,1.5):1);renderer.shadowMap.enabled=enabled;renderer.setSize(innerWidth,innerHeight);resize();},
    render(dt,time){
      if(high){
        try{finish.uniforms.time.value=time;composer.render(dt);return;}
        catch(error){high=false;console.warn('Se desactivaron los efectos de imagen para mantener el juego visible.',error);}
      }
      renderer.setRenderTarget(null);renderer.autoClear=true;scene.overrideMaterial=null;renderer.render(scene,camera);
    }
  };
}
