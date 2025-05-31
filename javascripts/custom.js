$(document).ready(function () {
    let productImageGroups = []
    $('.img-fluid').each(function () {
        let productImageSource = $(this).attr('src')
        let productImageTag = $(this).attr('tag')
        let productImageTitle = $(this).attr('title')
        if (productImageTitle) {
            productImageTitle = 'title="' + productImageTitle + '" '
        }
        else {
            productImageTitle = ''
        }
        $(this).
        wrap('<a class="boxedThumb ' + productImageTag + '" ' +
            productImageTitle + 'href="' + productImageSource + '"></a>')
        productImageGroups.push('.' + productImageTag)
    })
    jQuery.unique(productImageGroups)
    productImageGroups.forEach(productImageGroupsSet)

    function productImageGroupsSet (value) {
        $(value).simpleLightbox()
    }
})

// document.addEventListener("DOMContentLoaded", function () {
//     添加反馈部分到页面底部
//     const feedbackSection = `
//         <div style="text-align: center; padding: 20px;">
//             <h3>激励</h3>
//             <p>难道说……你愿意给我买一瓶快乐水吗！🫣</p>
//             <img src="https://s2.loli.net/2023/08/03/EGbIvMQXalKTsUi.png" width="200px">
//             <br>
//             <button style="font-size: 24px; padding: 10px;">👍</button>
//         </div>
//     `;
//     const footer = document.querySelector('footer');
//     if (footer) {
//         footer.insertAdjacentHTML('beforeend', feedbackSection);
//     }

//     触发 MathJax 渲染
//     MathJax.typesetPromise();
// });