#version 300 es
layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec2 a_center;
layout(location = 2) in vec3 a_conic;
layout(location = 3) in vec4 a_color;
layout(location = 4) in float a_depth;
layout(location = 5) in float a_radius;

uniform vec2 u_viewport;
uniform float u_foveatedStrength;

out vec2 v_offset;
out vec3 v_conic;
out vec4 v_color;
out vec2 v_center;
out float v_depth;

float foveatedScale(vec2 ndc) {
  float dist = length(ndc);
  return 1.0 - u_foveatedStrength * smoothstep(0.2, 0.95, dist);
}

void main() {
  float radius = a_radius * foveatedScale(a_center);

  // v_offset in PIXEL space relative to splat center
  v_offset = a_corner * radius;

  v_center = a_center;
  v_conic = a_conic;
  v_color = a_color;
  v_depth = a_depth;

  // Convert pixel offset to NDC space (-1 to 1) for gl_Position
  vec2 ndcOffset = (v_offset * 2.0) / max(u_viewport, vec2(1.0, 1.0));
  gl_Position = vec4(a_center + ndcOffset, 0.0, 1.0);
}
