$(document).ready(function() {
    $('#ojsxc').submit(function(event) {
        event.preventDefault();
        
        var post = $(this).serialize();

        $.post(OC.filePath('ojsxc', 'ajax', 'setsettings.php'), post, function(data) {
            if(data)
                $('#ojsxc .msg').text('Saved.');
            else
                $('#ojsxc .msg').text('Error.');
        });
        
    });
});