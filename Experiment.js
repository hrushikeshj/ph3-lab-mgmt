const path = require("path");
const fs = require("fs");
const marked = require("marked");
const process = require("process");
const shell = require("shelljs");

const Config = require("./Config.js");
const {LearningUnit} = require("./LearningUnit.js");
const {Task} = require("./Task.js");
const {UnitTypes, ContentTypes, BuildEnvs} = require("./Enums.js");

class Experiment {
  constructor(src) {
    this.src = src;
    this.descriptor = require(Experiment.descriptorPath(src));
  }

//   static build_path(src) {
//     console.log(path.basename(src));
//     return path.resolve(src, Config.Experiment.build_dir, path.basename(src));
//   }

  static ui_template_path = path.resolve(Config.Experiment.ui_template_name);

  static static_content_path = path.resolve(Config.Experiment.static_content_dir);

  static descriptorPath(src) {
    return path.resolve(src, `${Config.Experiment.descriptor_name}.json`);
  }

  clean() {
    const bp = path.resolve(this.src, Config.Experiment.build_dir);
    if (shell.test("-d", bp)){
      shell.rm("-rf", bp);
    }
  }

  static registerPartials(hb) {
    Config.Experiment.partials.forEach(([name, file]) => {
      const partial_content = fs.readFileSync(path.resolve(Experiment.ui_template_path, 'partials', `${file}.handlebars`));
      hb.registerPartial(name, partial_content.toString());
    });
  }

  init(hb) {
    try{
      const bp = Config.build_path(this.src);
      shell.mkdir(path.resolve(this.src, Config.Experiment.build_dir));
      shell.cp("-R", path.resolve(this.src, Config.Experiment.exp_dir), bp);
      shell.cp("-R", path.resolve(Experiment.ui_template_path, "assets"), bp);
      shell.cp("-R", path.resolve(Experiment.static_content_path, "feedback.md"), bp);
      Experiment.registerPartials(hb);
    }
    catch(e) {
      console.error(e);
      process.exit();
    }
  }

  name() {
    const name_file = fs.readFileSync(path.resolve(Config.build_path(this.src), "experiment-name.md"));
    return marked(name_file.toString());
  }


  build(options){
    /*
    here we are assuming that the descriptor contains a simgle object
    that represents the learning unit corresponding to the experiment.
    */
    const explu = LearningUnit.fromRecord(this.descriptor, this.src);
    const exp_info = {
      name: this.name(),
      menu: explu.units
    };

    console.log(options);

    explu.build(exp_info, options);
    if (options.env === BuildEnvs.TESTING) {
      shell.mv(path.resolve(Config.build_path(this.src), "*"), path.resolve(this.src, Config.Experiment.build_dir));
      shell.rm("-rf", Config.build_path(this.src));
    }
  }

  includeFeedback() {
    const feedbackLU = {
      "unit-type": "task",
      "label": "Feedback",
      "content-type": "text",
      "source": "feedback.md",
      "target": "feedback.html"
    };

    this.descriptor.units.push(feedbackLU);
  }
}

module.exports = {Experiment};
