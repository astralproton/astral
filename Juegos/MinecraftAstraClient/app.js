function checkClient() {
    const clientSelect = document.getElementById('clientSelect');
    const resolutionSelect = document.getElementById('resolutionSelect');

    if (clientSelect.value === 'Vanilla') {
        resolutionSelect.classList.add('disabled-select');
        resolutionSelect.classList.remove('enabled-select');
        resolutionSelect.disabled = true; 
    } else {
        resolutionSelect.classList.add('enabled-select');
        resolutionSelect.classList.remove('disabled-select');
        resolutionSelect.disabled = false;
    }
}

function launchClient() {
    const clientSelect = document.getElementById('clientSelect');
    const resolutionSelect = document.getElementById('resolutionSelect');

    const selectedClient = clientSelect.value;
    const selectedResolution = resolutionSelect.value;

    if (selectedClient === 'default') {
        alert("Please select a client!");
        return;
    }

    let pageUrl;
    if (selectedClient === 'Vanilla') {
        pageUrl = `Vanilla.html`;
    } else if(selectedResolution === '1.3'){
        window.open("https://barneycompiler.github.io/AstraClientEagler/javascript/", '_blank');
    }else{
        pageUrl = `${selectedClient}${selectedResolution}.html`;
    }


    window.open(pageUrl, '_blank');
}
