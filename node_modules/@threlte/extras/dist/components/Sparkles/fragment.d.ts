declare const _default: "\nvarying vec3 vColor;\nvarying float vOpacity;\n\nvoid main() {\n  float distanceToCenter = distance(gl_PointCoord, vec2(0.5));\n  float strength = 0.03 / distanceToCenter - 0.1;\n  float opacity = min(strength * vOpacity, 1.0);\n\n  if (opacity < 0.1) {\n    discard;\n  }\n\n  gl_FragColor = vec4(vColor, opacity);\n}";
export default _default;
