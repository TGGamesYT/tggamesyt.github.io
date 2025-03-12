function toggleMenu() {
    document.getElementById("sidebar").classList.toggle("active");
}
fetch('https://tggamesyt.github.io/outside.html')
    .then(response => response.text())
    .then(data => {
        let temp = document.createElement('div');
        temp.innerHTML = data;
        let navContent = temp.querySelector('#navigation');
        if (navContent) {
            document.getElementById('navbar').innerHTML = navContent.innerHTML;
        }
    });