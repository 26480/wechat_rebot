exports.parse = function (cli_opts, sopts, lopts) {
    var soptm = sopts.match(/\w:?/g),
        i = 0,
        options = {
            '?': [],
            ':': [],
            '-': []
        },
        j = '',
        k = [],
        l = 1;
    sopts = [];
    if (soptm instanceof Array) {
        for (; i < soptm.length; i++) {
            if (1 < soptm[i].length) {
                sopts[soptm[i].charAt(0)] = true;
            } else {
                sopts[soptm[i]] = false;
            }
        }
    }
    for (i = 0; i < cli_opts.length; i++) {
        j = cli_opts[i];
        if ('--' == j) { // options end
            i++;
            break;
        } else if ('-' != j.charAt(0)) { // not an option
            break;
        } else if ('-' == j.charAt(1)) { // long option
            k = j.match(/^--([^=]+)(=(.*))?$/);
            if (!options[k[1]]) {
                options[k[1]] = [];
            }
            if (undefined == lopts[k[1]]) { // unkown
                options['?'][options['?'].length] = k[1];
            } else if (k[2]) { // inline value
                options[k[1]][options[k[1]].length] = k[3];
            } else if (1 + i == cli_opts.length) { // options end
                if (lopts[k[1]]) {
                    options[':'][options[':'].length] = k[1];
                } else {
                    options[k[1]][options[k[1]].length] = false;
                }
            } else {
                k[3] = cli_opts[1 + i];
                if ('-' == k[3].charAt(0)) { // another option
                    if (lopts[k[1]]) { // expected
                        options[':'][options[':'].length] = k[1];
                    } else {
                        options[k[1]][options[k[1]].length] = false;
                    }
                } else {
                    i++;
                    options[k[1]][options[k[1]].length] = k[3];
                }
            }
        } else { // short option
            for (l = 1; l < j.length; l++) {
                if (!options[j[l]]) {
                    options[j[l]] = [];
                }
                if (undefined == sopts[j[l]]) { // unknown
                    options['?'][options['?'].length] = j[l];
                } else if (sopts[j[l]]) { // expected
                    if (1 + l < j.length) { // inline value
                        options[j[l]][options[j[l]].length] = j.substr(1 + l);
                        break;
                    } else if (1 + i == cli_opts.length || '-' == cli_opts[1 + i].charAt(0)) { // options end / another
                        options[':'][options[':'].length] = j[l];
                    } else {
                        options[j[l]][options[j[l]].length] = cli_opts[++i];
                    }
                } else {
                    options[j[l]][options[j[l]].length] = false;
                }
            }
        }
    }
    for (; i < cli_opts.length; i++) {
        options['-'][options['-'].length] = cli_opts[i];
    }
    return options;
}
