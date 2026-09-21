#version 300 es
precision highp float;

in vec2 v_offset;
in vec3 v_conic;
in vec4 v_color;
in vec2 v_center;
in float v_depth;

uniform float u_foveatedStrength;
uniform float u_renderMode;
uniform float u_depthMin;
uniform float u_depthMax;

out vec4 outColor;

vec3 depthColor(float depth) {
  float range = max(u_depthMax - u_depthMin, 0.0001);
  float t = clamp((depth - u_depthMin) / range, 0.0, 1.0);
  // Near = cyan, mid = purple, far = warm orange
  vec3 nearColor = vec3(0.2, 0.85, 1.0);
  vec3 farColor = vec3(1.0, 0.45, 0.15);
  return mix(nearColor, farColor, t);
}

void main() {
  float power = -0.5 * (
    v_conic.x * v_offset.x * v_offset.x +
    v_conic.z * v_offset.y * v_offset.y +
    2.0 * v_conic.y * v_offset.x * v_offset.y
  );

  if (power > 0.0) {
    discard;
  }

  float fovea = 1.0 - u_foveatedStrength * smoothstep(0.15, 0.9, length(v_center));
  float alpha = min(0.99, v_color.a * exp(power) * fovea);
  if (alpha < 0.004) {
    discard;
  }

  if (u_renderMode > 0.5) {
    vec3 rgb = depthColor(v_depth);
    outColor = vec4(rgb * alpha, alpha);
  } else {
    outColor = vec4(v_color.rgb * alpha, alpha);
  }
}
