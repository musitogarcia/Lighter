
$(document).ready(function () {
    var hue = jsHue();
    var user;


    if (!checkCookie()) {
        hue.discover().then(bridges => {
            console.log(bridges);
            if (bridges.length === 0) {
                console.log('No bridges found. :(');
                $("#modalError").modal('show');
            } else {
                bridges.forEach(function (b) {
                    setCookie("ip", b.internalipaddress, 30);
                });
                var bridge = hue.bridge(getCookie('ip'));
                var random = Math.floor(Math.random() * 1000);
                bridge.createUser('Lighter#lighter' + random).then(data => {
                    console.log(data);
                    if (data[0]['error'] != null) {
                        $("#modalConectar").modal('show');
                    } else {
                        var username = data[0].success.username;
                        setCookie("username", data[0].success.username, 30);
                        user = bridge.user(username);
                        actualizar();
                    }
                });
            }
        }).catch(e => {
            console.log('Error finding bridges', e);
            $("#modalError").modal('show');
        });
    } else {
        var bridge = hue.bridge(getCookie("ip"));
        var user = bridge.user(getCookie("username"));
        user.getGroups().then(data => {
            var divisorBotones = document.getElementById('divisor-botones');
            for (var grupo in data) {
                if (data[grupo]['lights'].length > 0) {
                    jumbo = document.createElement('div');
                    jumbo.id = 'jumbo-' + data[grupo]['name'];
                    jumbo.className = "jumbotron text-center mdb-color darken-4 mx-2 mb-5";
                    divisorBotones.appendChild(jumbo);
                    //hacerMenus(jumbo);
                    hacerBotones(grupo, data[grupo], jumbo);
                }
            }
        }).catch(e => {
            console.log('Error obteniendo grupos', e);
            $("#modalError").modal('show');
        });
    }

    function hacerMenus(jumbo) {
        menu = document.createElement("button");
        menu.className = 'btn btn-outline-warning waves-effect btn-sm float-right';
        icono = document.createElement('i');
        icono.className = 'fas fa-cog';
        menu.appendChild(icono);
        jumbo.appendChild(menu);
    }

    function hacerBotones(grupo, data, jumbo) {
        boton = document.createElement("button");
        boton.innerHTML = data['name'];
        boton.id = 'boton-' + data['name'];
        estado = false;
        if (data['state']['any_on']) {
            estado = true;
            boton.className = 'btn btn-outline-success waves-effect btn-lg btn-block';
        } else
            boton.className = 'btn btn-outline-danger waves-effect btn-lg btn-block';
        jumbo.appendChild(boton);
        if (estado) {
            document.getElementById('boton-' + data['name']).onclick = function () { apagar(grupo, data); }
            hacerSliders(grupo, data, jumbo);
            if (typeof data['action']['colormode'] !== 'undefined' && (data['action']['colormode'] == 'hs' || data['action']['colormode'] == 'xy'))
                hacerGrupoBotones(grupo, data, jumbo, true);
            else
                hacerGrupoBotones(grupo, data, jumbo, false);
        } else
            document.getElementById('boton-' + data['name']).onclick = function () { encender(grupo, data); }
    }

    function hacerSliders(grupo, data, jumbo) {
        slider = document.createElement("input");
        slider.id = 'slider-' + data['name'];
        slider.type = 'range';
        slider.className = 'custom-range';
        slider.min = '1';
        slider.max = '254';
        slider.value = data['action']['bri'];
        jumbo.appendChild(slider);
        $('#slider-' + data['name']).on('change', function () { deslizar(grupo, data); });
    }

    function hacerGrupoBotones(grupo, data, jumbo, soportaColor) {
        grupoBotones = document.createElement('div');
        grupoBotones.id = 'grupo-' + data['name'];
        grupoBotones.role = 'group';
        grupoBotones.className = 'btn-group';
        jumbo.appendChild(grupoBotones);

        if (soportaColor)
            botones = [document.createElement('button'), document.createElement('input')];
        else
            botones = [document.createElement('button')];
        botones[0].id = 'escenas-' + data['name'];
        botones[0].innerHTML = 'Escenas';
        botones[0].className = 'btn blue-gradient';
        botones[0].type = 'button';
        if (soportaColor) {
            botones[1].id = 'paleta-' + data['name'];
            botones[1].type = 'color';
        }

        for (let i = 0; i < botones.length; i++)
            grupoBotones.appendChild(botones[i]);

        document.getElementById('escenas-' + data['name']).onclick = function () {
            $("#fullHeightModalLeft").modal('show');
            document.getElementById('escena-luminosa').onclick = function () {
                encederEscena(grupo, data, 1);
            }
            document.getElementById('escena-relajante').onclick = function () {
                encederEscena(grupo, data, 2);
            }
            document.getElementById('escena-atenuada').onclick = function () {
                encederEscena(grupo, data, 3);
            }
            document.getElementById('escena-nocturna').onclick = function () {
                encederEscena(grupo, data, 4);
            }
        }
        if (soportaColor)
            $('#paleta-' + data['name']).on('change', function () { setColor(grupo, data) });
    }

    $("#modalError").on('show.bs.modal', function () {
        $("#boton-agregar").prop("disabled", true);
    });

    $("#modalAgregar").on('show.bs.modal', function () {
        var divisorLuces = document.getElementById('divisor-luces');
        divisorLuces.innerHTML = '';
        user.getLights().then(data => {
            for (var luz in data) {
                divisorLuz = document.createElement('div');
                divisorLuz.className = "custom-control custom-checkbox";
                divisorLuces.appendChild(divisorLuz);
                hacerCheckbox(luz, data[luz], divisorLuz);
            }
        }).catch(error => {
            console.log(error);
        });
    });

    function hacerCheckbox(luz, data, divisor) {
        checkbox = document.createElement("input");
        checkbox.type = 'checkbox';
        checkbox.id = data['name'];
        checkbox.name = luz;
        checkbox.className = 'custom-control-input';
        divisor.appendChild(checkbox);
        hacerLabel(luz, data, divisorLuz);
    }

    function hacerLabel(luz, data, divisor) {
        label = document.createElement("label");
        label.innerHTML = data['name'];
        label.className = 'custom-control-label';
        label.htmlFor = data['name'];
        divisor.appendChild(label);
    }

    $('#form-luces').submit(function (event) {
        correcto = true;
        contador = 0;
        event.preventDefault();
        datos = $('#form-luces').serializeArray();
        if (datos.length < 2) {
            alert('Elige al menos una luz');
        } else {
            lucesElegidas = [];
            for (let i = 1; i < datos.length; i++) {
                lucesElegidas.push(datos[i]['name']);
            }
            user.getGroups().then(grupos => {
                for (var grupo in grupos) {
                    if (grupos[grupo]['name'] != datos[0]['value']) {
                        if (grupos[grupo]['lights'].filter(element => lucesElegidas.includes(element)).length > 0) {
                            lucesRestantes = grupos[grupo]['lights'].filter(element => !lucesElegidas.includes(element));
                            console.log(lucesRestantes);
                            if (lucesRestantes.length > 0) {
                                user.setGroup(grupo, { lights: lucesRestantes });
                            } else {
                                user.deleteGroup(grupo);
                            }
                        } else
                            contador++;
                    } else {
                        alert('Ya hay un grupo llamado asi');
                        correcto == false;
                    }
                }
                if (contador != grupos.length)
                    correcto == false;
                if (correcto)
                    user.createGroup({
                        name: datos[0]['value'],
                        type: 'Room',
                        lights: lucesElegidas
                    }).then(resultado => {
                        console.log(resultado);
                        actualizar();
                    }).catch(error => {
                        alert(error);
                    });
            });
        }
    });

    function comparar(arr, arr2) {
        var ret = [];
        for (var i in this) {
            if (arr2.indexOf(this[i]) > -1) {
                ret.push(this[i]);
            }
        }
        return ret;
    }

    function encederEscena(grupo, data, escena) {
        slider = document.getElementById('slider-' + data['name']);
        brillo = 0;
        // temperatura = 0;
        // saturacion = 0;
        switch (escena) {
            case 1:
                brillo = 254;
                // temperatura = 233;
                // saturacion = 205;
                break;
            case 2:
                brillo = 153;
                // temperatura = 500;
                // saturacion = 13;
                break;
            case 3:
                brillo = 42;
                // temperatura = 366;
                // saturacion = 140;
                break;
            case 4:
                brillo = 10;
                // temperatura = 366;
                // saturacion = 199;
                break;
        }
        user.setGroupState(grupo, {
            bri: brillo,
            sat: 0//saturacion
            // ct: temperatura
        }).then(resultado => {
            //console.log(resultado)
            slider.value = brillo;
        });
    }

    function encender(grupo, data) {
        slider = document.getElementById('slider-' + data['name']);
        user.setGroupState(grupo, {
            on: true,
            bri: 254,
            sat: 0
        }).then(resultado => {
            jumbo = document.getElementById('jumbo-' + data['name']);
            if (typeof jumbo !== 'undefined') {
                hacerSliders(grupo, data, jumbo);
                if (typeof data['action']['colormode'] !== 'undefined' && (data['action']['colormode'] == 'hs' || data['action']['colormode'] == 'xy'))
                    hacerGrupoBotones(grupo, data, jumbo, true);
                else
                    hacerGrupoBotones(grupo, data, jumbo, false);
            }
            slider.value = 254;
            document.getElementById('boton-' + data['name']).classList.remove('btn-outline-danger');
            document.getElementById('boton-' + data['name']).classList.add('btn-outline-success');
            document.getElementById('boton-' + data['name']).onclick = function () { apagar(grupo, data); }
        });
    }

    function apagar(grupo, data) {
        user.setGroupState(grupo, {
            on: false
        }).then(resultado => {
            slider = document.getElementById('slider-' + data['name']);
            grupoBotones = document.getElementById('grupo-' + data['name']);
            if (typeof slider !== null && typeof grupoBotones !== null) {
                document.getElementById('jumbo-' + data['name']).removeChild(slider);
                document.getElementById('jumbo-' + data['name']).removeChild(grupoBotones);
            }
            document.getElementById('boton-' + data['name']).classList.remove('btn-outline-success');
            document.getElementById('boton-' + data['name']).classList.add('btn-outline-danger');
            document.getElementById('boton-' + data['name']).onclick = function () { encender(grupo, data); }
        });
    }

    function deslizar(grupo, data) {
        slider = document.getElementById('slider-' + data['name']);
        user.setGroupState(grupo, {
            on: true,
            bri: parseInt(slider.value)
        });
    }

    function setColor(grupo, data) {
        rgb = document.getElementById('paleta-' + data['name']).value;
        valorHue = rgbToHsl(parseInt(rgb.substr(1, 2), 16), parseInt(rgb.substr(3, 2), 16), parseInt(rgb.substr(5, 2), 16));
        if (typeof data['action']['colormode'] !== 'undefined' && (data['action']['colormode'] == 'hs' || data['action']['colormode'] == 'xy'))
            user.setGroupState(grupo, {
                hue: Math.round(valorHue[0] * 195.5),
                sat: Math.round(valorHue[1])
            });
    }

    function rgbToHsl(r, g, b) {
        r /= 255, g /= 255, b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;

        if (max == min) {
            h = s = 0;
        } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            s *= 254;
            h *= 60;
        }
        return [h, s, l];
    }
});

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=C:\Users\musit\Desktop\html";
}

function checkCookie() {
    var username = getCookie("username");
    if (username != "") {
        console.log("Bienvenido nuevamente " + username);
        return true;
    } else {
        console.log("Usuario no encontrado");
        return false;
    }
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ')
            c = c.substring(1);
        if (c.indexOf(name) == 0)
            return c.substring(name.length, c.length);
    }
    return "";
}

function actualizar() {
    window.location.reload();
}