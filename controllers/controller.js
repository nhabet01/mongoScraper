// Dependencies:
var express = require('express');
var request = require('request');
var cheerio = require('cheerio');
var mongoose = require('mongoose');

// Initialize express router.
var router = express.Router();

// Import models.
var Article = require('../models/article');
var Comment = require('../models/comment');

// Pulls articles (if any)from the DB and uses it to render the savedArticles.
router.get('/savedArticles', function (req, res) {
    // Find all articles.
    Article.find({}).sort({_id: 'desc'}).exec(function (err, data) {
        // Create array for article data.
        var resultData = [];
        // For each article, create an object that handlebars will use to render the article.
        data.forEach(function (article) {
            resultData.push({
                title: article.title,
                link: article.link,
                story: article.story,
                image: article.image,
                // articleID: article.articleID
            });
        });
        // Render savedArticles based on the result object compiled above.
        res.render('savedArticles', {result: resultData});
    });
});

// Scrape data from http://www.espn.com/nba/:
// router.get('/api/news', function (req, res) {
router.get('/', function (req, res) {
    
    request('https://www.espn.com/nba/', function (error, response, html) {

        // Load the html of the page into a cheerio $ variable, similar to jQuery $.
        var $ = cheerio.load(html);
        // Create array for article data.
        var resultData = [];

        // With cheerio, find each <section> with the 'contentItem__content--story' class.
        // (i: iterator. element: the current element)
        $('.contentItem__content--story').each(function (i, element) {

            // Grab the title.
            var title = $(element).children('a').children('.contentItem__contentWrapper').children('h1').text();

            // Grab the article URL.
            var link = $(element).children('a').attr('href');
            if (link.includes("www.espn.com")){
                link = link;
            }
            else{
                link ="https://www.espn.com"+link;
            }
            // 

            // Grab the article story line.
            var story = $(element).children('a').children('.contentItem__contentWrapper').children('p').text();

            // Grab the image URL.
            var image = $(element).children('a').children('.media-wrapper').children('.media-wrapper_image').children('img').attr('data-default-src');

        
            // Save these results in an object that we'll save to MongoDB.
            var newArticle = {
                    title: title,
                    link: link,
                    story: story,
                    image: image,
                    // articleID: articleID
            };
            resultData.push(newArticle);
            
        });

        res.render('index', {result: resultData});

    });
});

//Get comments for specific article; title is passed for reference
router.get('/:title', function(req,res){
// 
    var title = req.params.title;
    // Find all comments for that article ID.
    Article.find({title: title}).populate('comments').exec(function(err, data) {
        if (err) {
            console.log(err);
        } else {
            if (data.length > 0) {
                // initiate commentData array to be passed to handlebars
                var commentData = [];
                console.log("data: ");
                console.log(data);
                data[0].comments.forEach(function(comment) {
                    commentData.push({
                        id: comment._id,
                        author: comment.author,
                        text: comment.text,
                        timestamp: comment.timestamp
                        // articleID: articleID
                    });
                });

                var articleTitle = data[0].title;
                var link = data[0].link;
                commentData.push({articleTitle: articleTitle, link: link});

                res.render('comment', {commentData: commentData});
            } else {
                res.redirect('/savedArticles');//maybe don't redirect. Else statement not needed and associated if (data.length>0) not needed either...commentData can just be empty.
            }
        }
    });




});//end get comments route



//===============Posts==========================================

//Post route for saving an article
router.post('/savedArticles', function(req,res){
    console.log('req.body: '+req.body.article);
    var str = req.body.article;
    var title = str.slice(0, str.indexOf("$"));
    console.log("title: " +title);

    var str2 = str.slice(str.indexOf("$") + 1);
    var link = str2.slice(0, str2.indexOf("$"));

    var str3 = str2.slice(str2.indexOf("$") + 1);
    var story = str3.slice(0,str3.indexOf("$"));

    var image = str3.slice(str3.indexOf("$") + 1);

    var newArticle = {
        title: title,
        link: link,
        story: story,
        image: image
        // articleID: articleID
    };

    //Need to run a 'find and update' query to see if this article was already saved; if so, update, otherwise, save/insert.
    var query ={title:title};

    Article.findOneAndUpdate(query, newArticle, {upsert: true}, function (err) {
        if (err) {
            console.log(err);
        }
    });
});//end post (save article)

//Post(add) a comment:
router.post('/api/comment/:articleTitle', function(req, res) {
    var title = req.params.articleTitle;
    var text = req.body.text;
    var author = req.body.author;

    var newComment = {
        text: text,
        author: author
    };

    Comment.create(newComment, function(err, data) {
        if (err) {
            console.log("Error creating comment: ");
            console.log(err);
        } else {
            console.log(data);
            Article.findOneAndUpdate({title: title}, { $push: { 'comments': data._id } }, { new: true }, function(error) {
                if (error) {
                    console.log(error);
                } else {
                    res.redirect('/' + title);//redirecting to same page
                }
            });
        }
    });

});//end add comment to article

// Delete comment.
router.get('/api/comment/:articleTitle/:id', function(req, res) {
    //id is comment id (comment._id)
    var id = req.params.id;
    var title = req.params.articleTitle;
    Comment.remove({_id: id}, function(err) {
        if (err) {
            console.log(err);
        } else {
            Article.findOneAndUpdate({title: title}, { $pull: { comments: id } }, {safe: true}, function(error, data) {
                if (error) {
                    console.log(error);
                } else {
                    console.log(data);
                    res.redirect('/' + title);//again redirecting to page already on??
                }
            });
        }
    });
});


//====================Delete/Post===================
router.post('savedArticles/:title', function(req,res){
// Note:
// This method sends a remove command directly to MongoDB, no Mongoose documents are involved. Because no Mongoose documents are involved, no middleware (hooks) are executed.
    
    Article.remove({title: req.params.title}, function(err){
        console.log("req.params.title on delete");
        console.log(req.params.title);
        if(err){
            console.log(err);
        }
        else{
            res.redirect('/savedArticles');//...not sure I can "redirect to the page I'm already on.."
        }
    })
});//end delete article

module.exports = router;