// Deep extend only pure objects
deepExtendObj = (defaultOpt, opt) => {
  var toMerge = [];
  if ([Object, undefined].indexOf(opt && opt.constructor) < 0) return opt;

  for (let k in defaultOpt) {
    if ((k in opt) && [Object, undefined]
      .indexOf(defaultOpt[k] && defaultOpt[k].constructor) >= 0
    )
      toMerge.push({[k]: deepExtendOpt(defaultOpt[k], opt[k])});
  }
  return _.extend({}, defaultOpt, opt, ...toMerge);
};
